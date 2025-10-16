import { initializeCosmosDB } from './server/src/services/cosmos-db/cosmos-db.service.js';
import { INGESTION_CONSTANTS } from './server/src/services/ingestion/constants.js';
import { logger } from './server/src/utils/logger.js';

/**
 * Script to find orphaned row data where the import metadata has been deleted
 * but the associated row data remains
 */
async function findOrphanedData(): Promise<{ orphanedRows: { _partitionKey: string, id: string }[]; orphanedContent: { _partitionKey: string, id: string }[]; orphanedPartitionKeys: string[] }> {
  try {
    console.log('Connecting to Cosmos DB...');
    const cosmosDb = await initializeCosmosDB();
    
    // Query for all import metadata records to get the list of existing import IDs
    console.log('Querying for all import metadata records...');
    const metadataQuery = 'SELECT c.id FROM c WHERE c._partitionKey = @partitionKey AND c.documentType = @documentType';
    const metadataParams = [
      { name: '@partitionKey', value: INGESTION_CONSTANTS.METADATA_PARTITION_KEY }, // 'imports'
      { name: '@documentType', value: INGESTION_CONSTANTS.DOCUMENT_TYPES.IMPORT }   // 'excel-import'
    ];
    
    const allImportMetadatas = await cosmosDb.query<{ id: string }>(
      metadataQuery,
      metadataParams,
      INGESTION_CONSTANTS.METADATA_CONTAINER_NAME
    );
    
    console.log(`Found ${allImportMetadatas.length} import metadata records`);
    
    // Extract the import IDs from the metadata (remove 'import_' prefix to get the actual import ID)
    const existingImportIds = new Set<string>();
    for (const metadata of allImportMetadatas) {
      if (metadata.id.startsWith('import_')) {
        const importId = metadata.id.substring(7); // Remove 'import_' prefix
        existingImportIds.add(importId);
      }
    }
    
    console.log(`Found ${existingImportIds.size} unique existing import IDs`);
    
    // Query for all row data records to identify possible orphaned records
    console.log('Querying for all row data records...');
    const rowQuery = 'SELECT c._partitionKey, c.id FROM c WHERE c.documentType = @documentType';
    const rowParams = [
      { name: '@documentType', value: INGESTION_CONSTANTS.DOCUMENT_TYPES.ROW } // 'excel-row'
    ];
    
    const allRowData = await cosmosDb.query<{ _partitionKey: string, id: string }>(
      rowQuery,
      rowParams,
      INGESTION_CONSTANTS.DATA_CONTAINER_NAME
    );
    
    console.log(`Found ${allRowData.length} row data records total`);
    
    // Identify orphaned records (rows where the import ID doesn't exist in metadata)
    const orphanedRecords: { _partitionKey: string, id: string }[] = [];
    const partitionKeysToCheck = new Set<string>();
    
    for (const row of allRowData) {
      if (row._partitionKey.startsWith('import_')) {
        const importId = row._partitionKey.substring(7); // Remove 'import_' prefix
        if (!existingImportIds.has(importId)) {
          orphanedRecords.push(row);
          partitionKeysToCheck.add(row._partitionKey);
        }
      }
    }
    
    console.log(`\n# Find Orphaned Data Report #`);
    console.log(`Found ${orphanedRecords.length} orphaned row records`);
    console.log(`Spanning ${partitionKeysToCheck.size} different import partitions`);
    
    // Group orphaned records by partition key
    const groupedByPartition: { [key: string]: number } = {};
    for (const record of orphanedRecords) {
      groupedByPartition[record._partitionKey] = (groupedByPartition[record._partitionKey] || 0) + 1;
    }
    
    console.log(`\nOrphaned records by partition key:`);
    for (const [partitionKey, count] of Object.entries(groupedByPartition)) {
      console.log(`  ${partitionKey}: ${count} records`);
    }
    
    // Query for any other data that might be considered orphaned (content documents without import metadata)
    console.log(`\nQuerying for content documents that might be orphaned...`);
    const contentQuery = 'SELECT c._partitionKey, c.id FROM c WHERE NOT IS_DEFINED(c.documentType) AND c._partitionKey LIKE @pattern';
    const contentParams = [
      { name: '@pattern', value: 'import_%' }
    ];
    
    const allContentData = await cosmosDb.query<{ _partitionKey: string, id: string }>(
      contentQuery,
      contentParams,
      INGESTION_CONSTANTS.DATA_CONTAINER_NAME
    );
    
    console.log(`Found ${allContentData.length} potential content documents`);
    
    const orphanedContent: { _partitionKey: string, id: string }[] = [];
    for (const content of allContentData) {
      if (content._partitionKey.startsWith('import_')) {
        const importId = content._partitionKey.substring(7); // Remove 'import_' prefix
        if (!existingImportIds.has(importId)) {
          orphanedContent.push(content);
        }
      }
    }
    
    console.log(`Found ${orphanedContent.length} orphaned content records`);
    
    // Summary
    console.log(`\n# SUMMARY #`);
    console.log(`Total orphaned row records: ${orphanedRecords.length}`);
    console.log(`Total orphaned content records: ${orphanedContent.length}`);
    console.log(`Total orphaned records: ${orphanedRecords.length + orphanedContent.length}`);
    
    if (orphanedRecords.length > 0 || orphanedContent.length > 0) {
      console.log(`\n# RECOMMENDATION #`);
      console.log(`Run the cleanup script to remove these orphaned records: npm run cleanup-orphaned-data`);
    } else {
      console.log(`\nNo orphaned data found!`);
    }
    
    // Return the results for potential use in cleanup
    return {
      orphanedRows: orphanedRecords,
      orphanedContent: orphanedContent,
      orphanedPartitionKeys: Array.from(partitionKeysToCheck)
    };
    
  } catch (error) {
    logger.error('Error finding orphaned data:', error);
    throw error;
  }
}

// Only run if this file is executed directly
findOrphanedData()
  .then(() => {
    console.log('\nOrphaned data analysis completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in orphaned data analysis:', error);
    process.exit(1);
  });

export { findOrphanedData };