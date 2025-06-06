import { test, expect, beforeAll, afterAll } from 'vitest';
import { MongoClient } from 'mongodb';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_PORT = 3002;
const TEST_URL = `http://localhost:${TEST_PORT}`;
const TEST_FILE_PATH = path.join(__dirname, 'test-data', 'test.xlsx');

// Environment variables for test
process.env.PORT = TEST_PORT.toString();
process.env.NODE_ENV = 'test';
process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
process.env.AZURE_COSMOS_CONNECTION_STRING = 'mongodb://localhost:27017/test-db';
process.env.CORS_ORIGIN = '*';

// Import the server after setting environment variables
let server;
let dbClient;

beforeAll(async () => {
  // Start the server
  const { app } = await import('../server.js');
  server = app.listen(TEST_PORT);
  
  // Set up test database
  dbClient = new MongoClient(process.env.AZURE_COSMOS_CONNECTION_STRING);
  await dbClient.connect();
  
  // Create a simple Excel file for testing
  const testWorkbook = {
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {
        '!ref': 'A1:B3',
        A1: { t: 's', v: 'Name' },
        B1: { t: 's', v: 'Age' },
        A2: { t: 's', v: 'John' },
        B2: { t: 'n', v: 30 },
        A3: { t: 's', v: 'Jane' },
        B3: { t: 'n', v: 25 }
      }
    }
  };
  
  // Ensure test directory exists
  if (!fs.existsSync(path.dirname(TEST_FILE_PATH))) {
    fs.mkdirSync(path.dirname(TEST_FILE_PATH), { recursive: true });
  }
  
  // Write test file
  const XLSX = await import('xlsx');
  XLSX.writeFile(testWorkbook, TEST_FILE_PATH);
});

afterAll(async () => {
  // Clean up
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  
  if (dbClient) {
    await dbClient.close();
  }
  
  // Clean up test files
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
  }
});

test('should upload an Excel file successfully', async () => {
  const formData = new FormData();
  const fileContent = fs.readFileSync(TEST_FILE_PATH);
  const file = new Blob([fileContent], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  formData.append('file', file, 'test.xlsx');
  
  const response = await fetch(`${TEST_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  
  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
  expect(data.fileName).toBe('test.xlsx');
  expect(data.rowCount).toBe(2); // 2 rows of data (excluding header)
  expect(data.columnCount).toBe(2); // 2 columns (Name, Age)
  
  // Verify data was saved to Cosmos DB
  const db = dbClient.db('test-db');
  const collection = db.collection('excel-records');
  const record = await collection.findOne({ id: data.fileId });
  
  expect(record).toBeDefined();
  expect(record.fileName).toBe('test.xlsx');
  expect(record.data).toHaveLength(2);
  expect(record.headers).toEqual(['Name', 'Age']);
  
  // Verify file was uploaded to Blob Storage
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient('excel-uploads');
  const blockBlobClient = containerClient.getBlockBlobClient(data.fileId);
  const exists = await blockBlobClient.exists();
  
  expect(exists).toBe(true);
}, 30000);

test('should reject invalid file types', async () => {
  const formData = new FormData();
  const file = new Blob(['invalid content'], { type: 'text/plain' });
  formData.append('file', file, 'test.txt');
  
  const response = await fetch(`${TEST_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
  
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBeDefined();
});

test('should enforce file size limit', async () => {
  // Create a large file (11MB)
  const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
  const formData = new FormData();
  const file = new Blob([largeBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  formData.append('file', file, 'large.xlsx');
  
  const response = await fetch(`${TEST_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
  
  expect(response.status).toBe(413);
  const data = await response.json();
  expect(data.error).toBeDefined();
}, 30000);
