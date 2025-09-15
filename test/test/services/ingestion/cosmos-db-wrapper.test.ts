import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CosmosDbWrapper } from '../../../../server/src/services/ingestion/cosmos-db-wrapper.js';

describe('CosmosDbWrapper', () => {
  let cosmosDbWrapper: CosmosDbWrapper;
  let mockCosmosDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCosmosDb = {
      upsertRecord: vi.fn().mockResolvedValue({ _etag: 'mock-etag', statusCode: 200 }),
      query: vi.fn().mockResolvedValue([]),
      deleteRecord: vi.fn().mockResolvedValue(undefined),
    };

    cosmosDbWrapper = new CosmosDbWrapper();
  });

  it('should be defined', () => {
    expect(cosmosDbWrapper).toBeDefined();
  });

  it('should successfully upsert a record with proper logging', async () => {
    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    };

    const record = { id: 'test-id', data: 'test-data' };
    const containerName = 'test-container';
    const operationName = 'test-operation';

    const result = await cosmosDbWrapper.upsertRecordWithLogging(
      mockCosmosDb,
      record,
      containerName,
      operationName,
      mockLogger as any
    );

    expect(result).toBeDefined();
    expect(result._etag).toBe('mock-etag');
    expect(result.statusCode).toBe(200);
    expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(record, containerName);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Upserting record'),
      expect.any(Object)
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Successfully upserted record'),
      expect.any(Object)
    );
  });

  it('should handle upsert errors gracefully', async () => {
    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    };

    const record = { id: 'test-id', data: 'test-data' };
    const containerName = 'test-container';
    const operationName = 'test-operation';
    const errorMessage = 'Cosmos DB error';

    mockCosmosDb.upsertRecord.mockRejectedValue(new Error(errorMessage));

    await expect(
      cosmosDbWrapper.upsertRecordWithLogging(
        mockCosmosDb,
        record,
        containerName,
        operationName,
        mockLogger as any
      )
    ).rejects.toThrow(`Failed to ${operationName}: ${errorMessage}`);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to upsert record'),
      expect.any(Object)
    );
  });

  it('should successfully delete a record with proper logging', async () => {
    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    };

    const id = 'test-id';
    const partitionKey = 'test-partition';
    const containerName = 'test-container';
    const operationName = 'test-operation';

    await cosmosDbWrapper.deleteRecordWithLogging(
      mockCosmosDb,
      id,
      partitionKey,
      containerName,
      operationName,
      mockLogger as any
    );

    expect(mockCosmosDb.deleteRecord).toHaveBeenCalledWith(id, partitionKey, containerName);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Deleting record'),
      expect.any(Object)
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Successfully deleted record'),
      expect.any(Object)
    );
  });

  it('should handle delete errors gracefully', async () => {
    const mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
    };

    const id = 'test-id';
    const partitionKey = 'test-partition';
    const containerName = 'test-container';
    const operationName = 'test-operation';
    const errorMessage = 'Cosmos DB error';

    mockCosmosDb.deleteRecord.mockRejectedValue(new Error(errorMessage));

    await expect(
      cosmosDbWrapper.deleteRecordWithLogging(
        mockCosmosDb,
        id,
        partitionKey,
        containerName,
        operationName,
        mockLogger as any
      )
    ).rejects.toThrow(`Failed to ${operationName}: ${errorMessage}`);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete record'),
      expect.any(Object)
    );
  });
});