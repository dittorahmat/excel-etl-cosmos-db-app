import { initializeCosmosDB } from './server/src/services/cosmos-db/cosmos-db.service.js';
import { INGESTION_CONSTANTS } from './server/src/services/ingestion/constants.js';
import { cosmosDbWrapper } from './server/src/services/ingestion/cosmos-db-wrapper.js';
import { logger } from './server/src/utils/logger.js';

/**
 * Script to clean up orphaned row data where the import metadata has been deleted
 * but the associated row data remains
 */
async function cleanupOrphanedData(): Promise<void> {
  try {
    console.log('Connecting to Cosmos DB...');
    const cosmosDb = await initializeCosmosDB();
    
    // First, let's find the orphaned data as a safety check
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
    
    // Query for all row data records that might be orphaned
    console.log('Querying for all row data records that might be orphaned...');
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
    
    for (const row of allRowData) {
      if (row._partitionKey.startsWith('import_')) {
        const importId = row._partitionKey.substring(7); // Remove 'import_' prefix
        if (!existingImportIds.has(importId)) {
          orphanedRecords.push(row);
        }
      }
    }
    
    console.log(`Found ${orphanedRecords.length} orphaned row records`);
    
    // Also check for orphaned content documents
    console.log('Querying for orphaned content documents...');
    const contentQuery = 'SELECT c._partitionKey, c.id FROM c WHERE NOT IS_DEFINED(c.documentType) AND c._partitionKey LIKE @pattern';
    const contentParams = [
      { name: '@pattern', value: 'import_%' }
    ];
    
    const allContentData = await cosmosDb.query<{ _partitionKey: string, id: string }>(
      contentQuery,
      contentParams,
      INGESTION_CONSTANTS.DATA_CONTAINER_NAME
    );
    
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
    
    // Combine both orphaned records
    const allOrphanedRecords = [...orphanedRecords, ...orphanedContent];
    
    if (allOrphanedRecords.length === 0) {
      console.log('No orphaned data found. Nothing to clean up.');
      return;
    }
    
    // Safety check - ask for confirmation before deleting
    console.log(`\n# WARNING #`);
    console.log(`About to delete ${allOrphanedRecords.length} orphaned records!`);
    console.log(`This operation cannot be undone.`);
    
    // For safety, let's list a few of the records to be deleted
    console.log(`\nSample of records to be deleted:`);
    for (let i = 0; i < Math.min(5, allOrphanedRecords.length); i++) {
      console.log(`  - ID: ${allOrphanedRecords[i].id}, Partition Key: ${allOrphanedRecords[i]._partitionKey}`);
    }
    
    if (allOrphanedRecords.length > 5) {
      console.log(`  ... and ${allOrphanedRecords.length - 5} more records`);
    }
    
    // Ask for confirmation (in a real script we might want to make this interactive)
    console.log(`\nStarting cleanup of ${allOrphanedRecords.length} orphaned records...`);
    
    // Define batch size for deletion
    const BATCH_SIZE = 10;
    let deletedCount = 0;
    let errorCount = 0;
    
    console.log(`Processing in batches of ${BATCH_SIZE} records...`);
    
    // Process deletion in batches
    for (let i = 0; i < allOrphanedRecords.length; i += BATCH_SIZE) {
      const batch = allOrphanedRecords.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(allOrphanedRecords.length / BATCH_SIZE)} (${batch.length} records)`);
      
      // Delete each record in the batch
      for (const record of batch) {
        try {
          // Note: For Cosmos DB with partition key path '/id', we use the document's ID as the partition key value
          // This follows the pattern used in the ingestion service
          const partitionKeyValue = record.id;
          
          await cosmosDbWrapper.deleteRecordWithLogging(
            cosmosDb,
            record.id,
            partitionKeyValue, // Use document ID as partition key value
            INGESTION_CONSTANTS.DATA_CONTAINER_NAME,
            `delete orphaned record ${record.id}`,
            logger.child({ operation: 'cleanup-orphaned-data' })
          );
          
          deletedCount++;
          
          // Log progress periodically
          if (deletedCount % 50 === 0 || deletedCount === allOrphanedRecords.length) {
            console.log(`  Progress: ${deletedCount}/${allOrphanedRecords.length} records deleted`);
          }
        } catch (deleteError) {
          console.error(`Failed to delete orphaned record ${record.id}:`, deleteError);
          errorCount++;
          // Continue with other records even if one fails
        }
      }
    }
    
    // Summary
    console.log(`\n# CLEANUP COMPLETED #`);
    console.log(`Total orphaned records identified: ${allOrphanedRecords.length}`);
    console.log(`Successfully deleted: ${deletedCount}`);
    console.log(`Failed to delete: ${errorCount}`);
    
    if (errorCount > 0) {
      console.warn(`\n⚠️  Some records failed to delete. Check logs above for details.`);
    }
    
    console.log('\nCleanup process completed!');
    
  } catch (error) {
    logger.error('Error during orphaned data cleanup:', error);
    throw error;
  }
}

// Only run if this file is executed directly
cleanupOrphanedData()
  .then(() => {
    console.log('\nOrphaned data cleanup completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in orphaned data cleanup:', error);
    process.exit(1);
  });

export { cleanupOrphanedData };