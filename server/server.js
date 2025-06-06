import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
import cors from 'cors';
import { initializeBlobStorage, initializeCosmosDB, CONTAINER_NAMES } from './config/azure.js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'AZURE_STORAGE_CONNECTION_STRING',
  'AZURE_COSMOS_CONNECTION_STRING',
  'CORS_ORIGIN'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for the frontend
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// Configure multer for file uploads
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024;
const allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || '')
  .split(',')
  .map(type => type.trim());

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (allowedFileTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only ${allowedFileTypes.join(', ')} are allowed.`), false);
    }
  }
});

// Initialize Azure services
let blobStorage, cosmosDb;
try {
  blobStorage = initializeBlobStorage();
  cosmosDb = await initializeCosmosDB();
  
  // Ensure containers exist
  await blobStorage.getContainerClient(CONTAINER_NAMES.UPLOADS).createIfNotExists();
  await cosmosDb.getContainer(CONTAINER_NAMES.RECORDS);
  
  console.log('Azure services initialized successfully');
} catch (error) {
  console.error('Failed to initialize Azure services:', error);
  process.exit(1);
}

// Excel upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ 
      error: 'No file uploaded',
      details: 'Please provide an Excel file to upload'
    });
  }

  const file = req.file;
  const userId = req.user?.oid || 'anonymous';
  const timestamp = new Date().toISOString();
  const fileId = `${uuidv4()}-${file.originalname}`.replace(/[^a-zA-Z0-9.-]/g, '_');
  let blockBlobClient;

  try {
    // 1. Parse Excel file
    let workbook;
    try {
      workbook = xlsx.read(file.buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: true,
        cellText: true
      });
    } catch (parseError) {
      return res.status(400).json({
        error: 'Invalid Excel file',
        details: 'The uploaded file could not be parsed as an Excel file'
      });
    }

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length <= 1) {
      return res.status(400).json({
        error: 'Empty Excel file',
        details: 'The Excel file does not contain any data'
      });
    }


    // 2. Upload to Blob Storage
    try {
      blockBlobClient = blobStorage.getContainerClient(CONTAINER_NAMES.UPLOADS)
        .getBlockBlobClient(fileId);
      
      await blockBlobClient.upload(file.buffer, file.size, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
          blobContentDisposition: `attachment; filename="${file.originalname}"`
        },
        metadata: {
          originalName: file.originalname,
          uploadDate: timestamp,
          uploadedBy: userId
        }
      });
    } catch (blobError) {
      console.error('Error uploading to Blob Storage:', blobError);
      throw new Error('Failed to upload file to storage');
    }

    // 3. Save structured data to Cosmos DB
    try {
      const headers = data[0];
      const rows = data.slice(1);
      
      const document = {
        id: fileId,
        userId,
        fileName: file.originalname,
        uploadDate: timestamp,
        blobUrl: blockBlobClient.url,
        sheetName: firstSheetName,
        rowCount: rows.length,
        columnCount: headers.length,
        headers: headers,
        data: rows.map(row => {
          const rowObj = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index] || null;
          });
          return rowObj;
        }),
        metadata: {
          size: file.size,
          mimeType: file.mimetype,
          lastModified: file.lastModifiedDate ? file.lastModifiedDate.toISOString() : timestamp
        }
      };

      const container = await cosmosDb.getContainer(CONTAINER_NAMES.RECORDS);
      await container.items.create(document);

      // 4. Return success response
      res.status(200).json({
        success: true,
        message: 'File uploaded and processed successfully',
        fileId,
        fileName: file.originalname,
        sheetName: firstSheetName,
        rowCount: document.rowCount,
        columnCount: document.columnCount,
        uploadDate: timestamp,
        blobUrl: document.blobUrl
      });
    } catch (cosmosError) {
      console.error('Error saving to Cosmos DB:', cosmosError);
      
      // Attempt to clean up the blob if Cosmos DB insert failed
      if (blockBlobClient) {
        try {
          await blockBlobClient.delete();
        } catch (cleanupError) {
          console.error('Error cleaning up blob after Cosmos DB failure:', cleanupError);
        }
      }
      
      throw new Error('Failed to save file metadata to database');
    }
  } catch (error) {
    next(error);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
