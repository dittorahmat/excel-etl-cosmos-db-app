import { BlobServiceClient } from '@azure/storage-blob';
import { AZURE_CONFIG } from '../src/config/azure-config.js';

async function checkBlobCors() {
  const connectionString = AZURE_CONFIG.storage.connectionString;
  if (!connectionString) {
    console.error('Azure Storage connection string is not configured');
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const properties = await blobServiceClient.getProperties();
  
  console.log('Current CORS rules:');
  console.log(JSON.stringify(properties.cors || [], null, 2));
}

checkBlobCors().catch(console.error);
