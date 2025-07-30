import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Helper function to get environment variable with fallback
const getEnvVar = (key, fallback = '') => {
    // Try with AZURE_ prefix first, then without
    return process.env[`AZURE_${key}`] || process.env[key] || fallback;
};
// Azure service configuration
export const AZURE_CONFIG = {
    storage: {
        connectionString: getEnvVar('STORAGE_CONNECTION_STRING'),
        containerName: getEnvVar('STORAGE_CONTAINER', 'excel-uploads'),
    },
    cosmos: {
        connectionString: getEnvVar('COSMOS_CONNECTION_STRING'),
        endpoint: getEnvVar('COSMOS_ENDPOINT'),
        key: getEnvVar('COSMOS_KEY'),
        databaseName: getEnvVar('COSMOS_DATABASE', 'excel-upload-db'),
        containerName: getEnvVar('COSMOS_CONTAINER', 'excel-records'),
        partitionKey: getEnvVar('COSMOS_PARTITION_KEY', '/id'),
    },
};
// Temporarily log Cosmos DB configuration for debugging
console.log('Cosmos DB Configuration:');
console.log('  Connection String:', AZURE_CONFIG.cosmos.connectionString ? '*****' : 'Not set');
console.log('  Endpoint:', AZURE_CONFIG.cosmos.endpoint ? AZURE_CONFIG.cosmos.endpoint : 'Not set');
console.log('  Key:', AZURE_CONFIG.cosmos.key ? '*****' : 'Not set'); // Masking key for security
console.log('  Database Name:', AZURE_CONFIG.cosmos.databaseName);
console.log('  Container Name:', AZURE_CONFIG.cosmos.containerName);
