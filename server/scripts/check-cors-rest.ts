import { BlobServiceClient } from '@azure/storage-blob';
import { AZURE_CONFIG } from '../src/config/azure-config.js';

async function checkCors() {
  const connectionString = AZURE_CONFIG.storage.connectionString;
  if (!connectionString) {
    console.error('Azure Storage connection string is not configured');
    return;
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  
  try {
    console.log('Fetching service properties...');
    const properties = await blobServiceClient.getProperties();
    console.log('Current CORS rules:', JSON.stringify(properties.cors || [], null, 2));
    
    if (!properties.cors || properties.cors.length === 0) {
      console.log('No CORS rules are currently configured.');
    } else {
      console.log('CORS rules are configured.');
    }
  } catch (error) {
    console.error('Error fetching service properties:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response body:', await error.response.text());
    }
  }
}

checkCors().catch(console.error);
