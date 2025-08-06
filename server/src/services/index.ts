// Blob Storage
export { initializeBlobStorage, initializeBlobStorageAsync, getOrInitializeBlobStorage } from './blob-storage/blob-storage.service.js';
export { initializeMockBlobStorage } from './blob-storage/mock-blob-storage.js';

// Cosmos DB
export { initializeCosmosDB, testCosmosConnection } from './cosmos-db/cosmos-db.service.js';
export { initializeMockCosmosDB } from './cosmos-db/mock-cosmos-db.js';

export type { AzureBlobStorage } from '../types/azure.js';
export type { AzureCosmosDB } from '../types/azure.js';
