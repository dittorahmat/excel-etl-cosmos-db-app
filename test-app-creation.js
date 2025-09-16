import { createApp } from './server/dist/server/src/config/app.js';
import { initializeAzureServices } from './server/dist/server/src/config/azure-services.js';

async function testAppCreation() {
  try {
    console.log('Initializing Azure services...');
    const azureServices = await initializeAzureServices();
    console.log('Azure services initialized successfully');
    
    console.log('Creating Express application...');
    const app = createApp(azureServices);
    console.log('Express application created successfully');
    
    if (app) {
      console.log('App creation successful');
    } else {
      console.log('App creation failed - returned null');
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testAppCreation();