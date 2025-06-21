# Migration Guide: Azure Services Refactoring

This guide explains the changes made during the refactoring of the Azure services and how to update your code to use the new structure.

## Changes Overview

The monolithic `azure.ts` file has been split into smaller, focused modules:

```
src/
  services/
    blob-storage/
      blob-storage.service.ts   # Main Blob Storage implementation
      mock-blob-storage.ts      # Mock implementation for testing
    cosmos-db/
      cosmos-db.service.ts      # Main Cosmos DB implementation
      mock-cosmos-db.ts         # Mock implementation for testing
    index.ts                    # Barrel exports
  types/
    azure.ts                  # Type definitions
  config/
    azure-config.ts           # Configuration
```

## How to Update Imports

### Old Imports

```typescript
import { 
  AZURE_CONFIG,
  AzureBlobStorage, 
  AzureCosmosDB,
  initializeMockBlobStorage,
  initializeMockCosmosDB,
  initializeBlobStorage,
  initializeCosmosDB,
  getOrInitializeBlobStorage,
  getOrInitializeCosmosDB
} from './config/azure';
```

### New Imports

```typescript
// Types and interfaces
import { 
  AzureBlobStorage,
  AzureCosmosDB,
  MockBlobStorage,
  MockCosmosDB
} from './types/azure';

// Configuration
import { AZURE_CONFIG } from './config/azure-config';

// Blob Storage
import {
  initializeBlobStorage,
  initializeBlobStorageAsync,
  getOrInitializeBlobStorage,
  initializeMockBlobStorage
} from './services';

// Cosmos DB
import {
  initializeCosmosDB,
  createCosmosDbClient,
  getOrInitializeCosmosDB,
  initializeMockCosmosDB
} from './services';
```

## Key Changes

1. **Type Definitions**
   - Moved to `types/azure.ts`
   - Includes all interfaces and type aliases

2. **Configuration**
   - Moved to `config/azure-config.ts`
   - Contains only the `AZURE_CONFIG` constant

3. **Blob Storage**
   - Implementation in `services/blob-storage/blob-storage.service.ts`
   - Mock implementation in `services/blob-storage/mock-blob-storage.ts`

4. **Cosmos DB**
   - Implementation in `services/cosmos-db/cosmos-db.service.ts`
   - Mock implementation in `services/cosmos-db/mock-cosmos-db.ts`

5. **Barrel Exports**
   - All services are re-exported from `services/index.ts`
   - Allows for cleaner imports

## Migration Steps

1. Update all imports to use the new module structure
2. Update any direct property access to use the new interfaces
3. Test thoroughly to ensure all functionality remains the same
4. Remove the old `azure.ts` file once migration is complete

## Testing

Run the test suite to ensure everything works as expected:

```bash
npm test
```

## Notes

- The public API remains largely the same, but the implementation is now split across multiple files
- Mock implementations are now more robust and type-safe
- Each service has its own dedicated test file
