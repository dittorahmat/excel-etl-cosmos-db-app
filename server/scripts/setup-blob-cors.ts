import { BlobServiceClient } from '@azure/storage-blob';
import { AZURE_CONFIG } from '../src/config/azure-config.js';
import { logger } from '../src/utils/logger.js';

// Enable debug logging
process.env.DEBUG = 'azure*';

async function setupBlobCors() {
  console.log('Starting CORS configuration...');
  
  try {
    const connectionString = AZURE_CONFIG.storage.connectionString;
    if (!connectionString) {
      throw new Error('Azure Storage connection string is not configured');
    }
    
    console.log('Using storage account:', 
      connectionString.match(/AccountName=([^;]+)/i)?.[1] || 'unknown');

    // Extract account name and key from connection string
    const accountName = connectionString.match(/AccountName=([^;]+)/i)?.[1] || '';
    const accountKey = connectionString.match(/AccountKey=([^;]+)/i)?.[1] || '';
    const containerName = AZURE_CONFIG.storage.containerName;

    if (!accountName || !accountKey) {
      throw new Error('Could not extract account name and key from connection string');
    }

    const blobServiceClient = new BlobServiceClient(connectionString);
    
    // Define CORS rules
    const corsRules = [
      {
        allowedOrigins: [
          'http://localhost:3000', // Local development
          'https://your-frontend-domain.com' // Production domain
        ].join(','),
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'].join(','),
        allowedHeaders: ['*'].join(','),
        exposedHeaders: ['*'].join(','),
        maxAgeInSeconds: 86400 // 24 hours
      }
    ];
    
    console.log('Setting CORS rules:', JSON.stringify(corsRules, null, 2));
    
    await blobServiceClient.setProperties({
      cors: corsRules
    });

    logger.info('Successfully configured CORS for Blob Storage', {
      accountName,
      containerName
    });
    
    console.log('CORS configuration applied successfully');
  } catch (error) {
    logger.error('Failed to configure Blob Storage CORS', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('Error configuring CORS:', error);
    process.exit(1);
  }
}

// Run the setup
setupBlobCors();
