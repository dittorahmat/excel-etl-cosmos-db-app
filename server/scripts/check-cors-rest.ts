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
  } catch (error: unknown) {
    console.error('Error fetching service properties:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; text?: () => Promise<string> } };
      console.error('Response status:', axiosError.response?.status || 'unknown');
      if (axiosError.response?.text) {
        console.error('Response body:', await axiosError.response.text());
      }
    }
  }
}

checkCors().catch(console.error);
