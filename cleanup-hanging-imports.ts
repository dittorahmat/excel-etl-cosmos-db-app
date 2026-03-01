import { initializeCosmosDB } from './server/src/services/cosmos-db/cosmos-db.service.js';
import { INGESTION_CONSTANTS } from './server/src/services/ingestion/constants.js';
import { cosmosDbWrapper } from './server/src/services/ingestion/cosmos-db-wrapper.js';
import { logger } from './server/src/utils/logger.js';

interface ImportMetadata {
  id: string;
  _importId: string;
  fileName: string;
  status: string;
  rowCount?: number;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Script to clean up hanging import metadata (metadata without row data)
 * This is the REVERSE of cleanup-orphaned-data.ts
 */
async function cleanupHangingImports(): Promise<void> {
  try {
    console.log('Connecting to Cosmos DB...');
    const cosmosDb = await initializeCosmosDB();

    // Step 1: Query all import metadata
    console.log('Querying all import metadata...\n');
    const metadataQuery = 'SELECT c.id, c._importId, c.fileName, c.status, c.rowCount, c.createdAt, c.updatedAt FROM c WHERE c._partitionKey = @partitionKey AND c.documentType = @documentType';
    const metadataParams = [
      { name: '@partitionKey', value: INGESTION_CONSTANTS.METADATA_PARTITION_KEY },
      { name: '@documentType', value: INGESTION_CONSTANTS.DOCUMENT_TYPES.IMPORT }
    ];

    const allImportMetadatas = await cosmosDb.query<ImportMetadata>(
      metadataQuery,
      metadataParams,
      INGESTION_CONSTANTS.METADATA_CONTAINER_NAME
    );

    console.log(`Found ${allImportMetadatas.length} import metadata records\n`);

    // Step 2: Extract import IDs from metadata
    const existingImportIds = new Map<string, ImportMetadata>();
    
    for (const metadata of allImportMetadatas) {
      let importId = metadata.id;
      if (importId.startsWith('import_')) {
        importId = importId.substring(7);
      }
      existingImportIds.set(importId, metadata);
    }

    console.log(`Found ${existingImportIds.size} unique import IDs\n`);

    // Step 3: Query all row data
    console.log('Querying all row data...\n');
    const rowQuery = 'SELECT c._partitionKey FROM c WHERE c.documentType = @documentType';
    const rowParams = [
      { name: '@documentType', value: INGESTION_CONSTANTS.DOCUMENT_TYPES.ROW }
    ];

    const allRowData = await cosmosDb.query<{ _partitionKey: string }>(
      rowQuery,
      rowParams,
      INGESTION_CONSTANTS.DATA_CONTAINER_NAME
    );

    console.log(`Found ${allRowData.length} row data records total\n`);

    // Step 4: Find which import IDs have row data
    const importIdsWithRows = new Set<string>();
    for (const row of allRowData) {
      if (row._partitionKey && row._partitionKey.startsWith('import_')) {
        importIdsWithRows.add(row._partitionKey);
      }
    }

    // Step 5: Identify hanging imports
    const hangingImports: ImportMetadata[] = [];

    for (const [importId, metadata] of existingImportIds.entries()) {
      if (!importIdsWithRows.has(importId)) {
        hangingImports.push(metadata);
      }
    }

    console.log(`Found ${hangingImports.length} hanging import metadata records\n`);

    if (hangingImports.length === 0) {
      console.log('No hanging imports found. Nothing to clean up.');
      return;
    }

    // Step 6: Display hanging imports
    console.log('\n# HANGING IMPORTS FOUND #');
    hangingImports.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.fileName} (${m._importId || m.id})`);
    });

    // Step 7: Delete hanging imports
    console.log(`\nDeleting ${hangingImports.length} hanging imports...\n`);
    
    let deletedCount = 0;
    let errorCount = 0;

    for (const importMeta of hangingImports) {
      try {
        await cosmosDbWrapper.deleteRecordWithLogging(
          cosmosDb,
          importMeta.id,
          INGESTION_CONSTANTS.METADATA_PARTITION_KEY,
          INGESTION_CONSTANTS.METADATA_CONTAINER_NAME,
          `delete hanging import ${importMeta.id}`,
          logger.child({ operation: 'cleanup-hanging-imports' })
        );
        deletedCount++;
      } catch (deleteError) {
        console.error(`Failed to delete ${importMeta.id}:`, deleteError);
        errorCount++;
      }
    }

    // Step 8: Summary
    console.log('\n# CLEANUP COMPLETED #');
    console.log(`Deleted: ${deletedCount}, Failed: ${errorCount}\n`);

  } catch (error) {
    logger.error('Error during cleanup:', error);
    throw error;
  }
}

cleanupHangingImports()
  .then(() => {
    console.log('Cleanup completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

export { cleanupHangingImports };
