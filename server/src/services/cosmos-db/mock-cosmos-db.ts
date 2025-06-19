import { vi } from 'vitest';
import { MockCosmosDB, CosmosRecord } from '../../types/azure.js';

// In-memory store for mock data
const mockDataStore: Record<string, Record<string, any>> = {};

/**
 * Initialize mock Cosmos DB for development and testing
 * @returns A mock implementation of AzureCosmosDB
 */
export function initializeMockCosmosDB(): MockCosmosDB {
  const upsertMock = vi.fn().mockImplementation(
    async <T extends CosmosRecord>(record: T, containerName = 'default'): Promise<T> => {
      if (!mockDataStore[containerName]) {
        mockDataStore[containerName] = {};
      }
      
      const id = record.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const recordWithId = { ...record, id };
      mockDataStore[containerName][id] = recordWithId;
      return recordWithId as T;
    }
  );

  const queryMock = vi.fn().mockImplementation(
    async <T extends CosmosRecord>(
      query: string,
      parameters: { name: string; value: any }[] = [],
      containerName = 'default'
    ): Promise<T[]> => {
      if (!mockDataStore[containerName]) {
        return [];
      }
      
      // Simple mock query implementation - in a real scenario, this would parse the query
      return Object.values(mockDataStore[containerName]) as T[];
    }
  );

  const getByIdMock = vi.fn().mockImplementation(
    async <T extends CosmosRecord>(
      id: string,
      _partitionKey: string,
      containerName = 'default'
    ): Promise<T | undefined> => {
      if (!mockDataStore[containerName]) {
        return undefined;
      }
      return mockDataStore[containerName][id] as T | undefined;
    }
  );

  const deleteMock = vi.fn().mockImplementation(
    async (
      id: string,
      _partitionKey: string,
      containerName = 'default'
    ): Promise<void> => {
      if (mockDataStore[containerName]) {
        delete mockDataStore[containerName][id];
      }
    }
  );

  const containerMock = vi.fn().mockImplementation(async () => ({
    items: {
      upsert: upsertMock,
      query: queryMock,
    },
  }));

  const mockCosmosDB: MockCosmosDB = {
    cosmosClient: {
      databases: {
        createIfNotExists: vi.fn().mockResolvedValue({
          database: {
            containers: {
              createIfNotExists: vi.fn().mockResolvedValue({
                container: containerMock,
              }),
            },
          },
        }),
      },
    } as any,
    container: containerMock,
    upsertRecord: upsertMock,
    query: queryMock,
    getById: getByIdMock,
    deleteRecord: deleteMock,
    _mocks: {
      upsert: upsertMock,
      query: queryMock,
      getById: getByIdMock,
      delete: deleteMock,
    },
  };

  return mockCosmosDB;
}
