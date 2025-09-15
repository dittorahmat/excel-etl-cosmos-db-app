import type { AzureCosmosDB, CosmosRecord } from '../../types/azure.js';
import type { ItemResponse as AzureItemResponse } from '@azure/cosmos';

/**
 * A wrapper class for Cosmos DB operations to eliminate duplicated code patterns
 * in saveImportMetadata and saveRows methods.
 */
export class CosmosDbWrapper {
  /**
   * Upsert a record with consistent logging and error handling
   */
  async upsertRecordWithLogging<T extends CosmosRecord>(
    cosmosDb: AzureCosmosDB,
    record: T,
    containerName: string,
    operationName: string,
    logger: { debug: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void }
  ): Promise<AzureItemResponse<T>> {
    try {
      logger.debug(`Upserting record for ${operationName}`, {
        container: containerName,
        record: {
          ...record,
          // Don't log sensitive data
          ...(record && typeof record === 'object' && 'data' in record ? { data: '[REDACTED]' } : {})
        }
      });

      const result = await cosmosDb.upsertRecord<T>(record, containerName);

      logger.debug(`Successfully upserted record for ${operationName}`, {
        container: containerName,
        statusCode: result.statusCode,
        etag: result.resource?._etag
      });

      return result;
    } catch (error) {
      logger.error(`Failed to upsert record for ${operationName}`, {
        container: containerName,
        error,
        record: {
          ...record,
          // Don't log sensitive data
          ...(record && typeof record === 'object' && 'data' in record ? { data: '[REDACTED]' } : {})
        }
      });
      throw new Error(`Failed to ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a record with consistent logging and error handling
   */
  async deleteRecordWithLogging(
    cosmosDb: AzureCosmosDB,
    id: string,
    partitionKey: string,
    containerName: string,
    operationName: string,
    logger: { debug: (msg: string, meta?: any) => void; error: (msg: string, meta?: any) => void }
  ): Promise<void> {
    try {
      logger.debug(`Deleting record for ${operationName}`, {
        container: containerName,
        id,
        partitionKey
      });

      await cosmosDb.deleteRecord(id, partitionKey, containerName);

      logger.debug(`Successfully deleted record for ${operationName}`, {
        container: containerName,
        id,
        partitionKey
      });
    } catch (error) {
      logger.error(`Failed to delete record for ${operationName}`, {
        container: containerName,
        id,
        partitionKey,
        error
      });
      throw new Error(`Failed to ${operationName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const cosmosDbWrapper = new CosmosDbWrapper();

export default cosmosDbWrapper;