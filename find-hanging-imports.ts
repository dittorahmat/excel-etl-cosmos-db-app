import { initializeCosmosDB } from './server/src/services/cosmos-db/cosmos-db.service.js';
import { INGESTION_CONSTANTS } from './server/src/services/ingestion/constants.js';
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
 * Script to find hanging import metadata where the import exists
 * but has no associated row data (failed or incomplete ingestion)
 * 
 * This is the REVERSE of find-orphaned-data.ts:
 * - find-orphaned-data.ts: finds rows WITHOUT metadata
 * - This script: finds metadata WITHOUT rows
 */
async function findHangingImports(): Promise<ImportMetadata[]> {
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
    const healthyImports: ImportMetadata[] = [];

    for (const [importId, metadata] of existingImportIds.entries()) {
      if (importIdsWithRows.has(importId)) {
        healthyImports.push(metadata);
      } else {
        hangingImports.push(metadata);
      }
    }

    // Step 6: Display results
    console.log('\n# HANGING IMPORTS REPORT #');
    console.log('='.repeat(60));
    console.log(`Found ${hangingImports.length} hanging import metadata records:\n`);

    if (hangingImports.length > 0) {
      hangingImports.forEach((importMeta, index) => {
        console.log(`  ${index + 1}. ${importMeta.fileName} (${importMeta._importId || importMeta.id})`);
        console.log(`     status: ${importMeta.status}, rowCount: ${importMeta.rowCount ?? 'undefined'}`);
      });
    } else {
      console.log('  ✅ No hanging imports found!');
    }

    console.log(`\n\nHealthy imports: ${healthyImports.length}`);

    // Step 7: Summary
    console.log('\n\n# SUMMARY #');
    console.log('='.repeat(60));
    console.log(`Total: ${allImportMetadatas.length}, Hanging: ${hangingImports.length}, Healthy: ${healthyImports.length}`);
    console.log('='.repeat(60));

    if (hangingImports.length > 0) {
      console.log('\n# RECOMMENDATION #');
      console.log('Run: npx tsx cleanup-hanging-imports.ts');
    }

    return hangingImports;

  } catch (error) {
    logger.error('Error finding hanging imports:', error);
    throw error;
  }
}

findHangingImports()
  .then((hangingImports) => {
    console.log(`\nFound ${hangingImports.length} hanging imports.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

export { findHangingImports };
