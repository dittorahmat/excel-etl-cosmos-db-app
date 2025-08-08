import { 
  BlobServiceClient, 
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  BlockBlobClient
} from '@azure/storage-blob';
import { AZURE_CONFIG } from '../src/config/azure-config.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

async function testDownload() {
  let testFilePath: string | null = null;
  let blockBlobClient: BlockBlobClient | null = null;
  
  try {
    console.log('Starting download test...');
    
    // 1. Create a test file
    const testContent = 'This is a test file for download verification';
    const testFileName = `test-${uuidv4()}.txt`;
    testFilePath = join(process.cwd(), testFileName);
    
    // Ensure test directory exists
    writeFileSync(testFilePath, testContent);
    console.log(`Created test file: ${testFilePath}`);

    // 2. Upload the test file
    console.log('Uploading test file...');
    const connectionString = AZURE_CONFIG.storage.connectionString;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.storage.containerName);
    
    // Create container if it doesn't exist
    await containerClient.createIfNotExists();
    
    blockBlobClient = containerClient.getBlockBlobClient(testFileName);
    await blockBlobClient.uploadFile(testFilePath);
    console.log('Test file uploaded successfully');

    // 3. Generate a SAS URL for the blob
    const sasToken = await generateSasToken(blobServiceClient, testFileName);
    const blobUrl = `${blockBlobClient.url}?${sasToken}`;
    console.log('Generated SAS URL:', blobUrl);
    
    // Add a small delay to ensure the blob is available
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Test downloading the file
    console.log('Testing file download...');
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Download failed with status ${response.status}: ${response.statusText}`);
      }
      
      const downloadedContent = await response.text();
      console.log('Downloaded content:', downloadedContent);
      
      if (downloadedContent === testContent) {
        console.log('✅ Test passed: Downloaded content matches the original');
      } else {
        console.error('❌ Test failed: Downloaded content does not match the original');
      }
    } catch (error) {
      console.error('Error during download test:', error);
      throw error;
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    try {
      if (testFilePath) {
        unlinkSync(testFilePath);
        console.log('Cleaned up test file');
      }
      
      // Delete the blob
      if (blockBlobClient) {
        await blockBlobClient.deleteIfExists();
        console.log('Cleaned up test blob');
      }
    } catch (e) {
      console.error('Error during cleanup:', e);
    }
  }
}

async function generateSasToken(blobServiceClient: BlobServiceClient, blobName: string): Promise<string> {
  const accountName = AZURE_CONFIG.storage.connectionString?.match(/AccountName=([^;]+)/i)?.[1] || '';
  const accountKey = AZURE_CONFIG.storage.connectionString?.match(/AccountKey=([^;]+)/i)?.[1] || '';
  
  if (!accountName || !accountKey) {
    throw new Error('Could not extract account name and key from connection string');
  }
  
  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  
  // Generate SAS token valid for 1 hour
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: AZURE_CONFIG.storage.containerName,
      blobName: blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    },
    sharedKeyCredential
  ).toString();

  return sasToken;
}

testDownload().catch(console.error);
