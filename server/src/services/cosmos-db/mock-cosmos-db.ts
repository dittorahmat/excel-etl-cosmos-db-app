import type { MockCosmosDB, CosmosRecord } from '../../types/azure.js';
import type {
  Container,
  ContainerResponse,
  Database,
  SqlQuerySpec,
  ContainerRequest,
  Items,
  FeedOptions,
  FeedResponse,
  CosmosClient as CosmosClientType,
  ItemResponse
} from '@azure/cosmos';
import type {
  CosmosDiagnostics,
  GatewayStatistics,
  DiagnosticNode
} from '../../types/cosmos-mock-types.js';



// In-memory store for mock data
interface MockDataStore {
  [containerName: string]: {
    [recordId: string]: unknown;
  };
}

const mockDataStore: MockDataStore = {};

// Mock GatewayStatistics
const _mockGatewayStats: GatewayStatistics[] = [];

// Mock DiagnosticNode
const createMockDiagnosticNode = (): DiagnosticNode => {
  const node: DiagnosticNode = {
    id: 'mock-diagnostic-node',
    nodeType: 'mock',
    data: {},
    children: [],
    startTimeUTCInMs: Date.now(),
    durationInMs: 0,
    record: (): void => { /* no-op */ }
  };
  return node;
};

// Mock CosmosDiagnostics
const createMockDiagnostics = (): CosmosDiagnostics => ({
  diagnosticNode: createMockDiagnosticNode(),
  clientSideRequestStatistics: {
    requestStartTimeUTC: new Date(),
    requestEndTimeUTC: new Date(),
    requestLatencyInMs: 0,
    retryCount: 0,
    metadataCallCount: 0,
    metadataCallsDurationInMs: 0,
    requestPayloadLengthInBytes: 0,
    responsePayloadLengthInBytes: 0,
    operationType: 'Read',
    resourceType: 'Document',
    statusCode: 200,
    requestId: 'mock-request-id',
    activityId: 'mock-activity-id',
    requestCharge: 1,
    requestPayloadLength: 0,
    responsePayloadLength: 0,
    locationEndpointToAddress: {},
    gatewayStatistics: _mockGatewayStats,
    clientCorrelationId: 'mock-correlation-id',
    connectionReused: false,
    connectionId: 'mock-connection-id',
    connectionTimeoutInMs: 0,
    failedAttempts: [],
    metadataLookupInMs: 0,
    partitionKeyRangeId: 'mock-partition-key-range-id',
    requestPayload: undefined,
    responsePayload: undefined,
    serializationDiagnostics: {},
    systemInformation: {},
    transportRequestTimeline: [],
    useMultipleWriteLocations: false,
    payloadSentInBytes: 0,
    payloadReceivedInBytes: 0,
    requestPayloadLengthInBytesToRead: 0,
    responsePayloadLengthInBytesToRead: 0,
    requestPayloadReadInBytes: 0,
    responsePayloadReadInBytes: 0,
    payloadSentInBytesToFlush: 0,
    payloadSentInBytesFlushed: 0,
    requestPayloadStartTimeUTC: new Date(),
    requestPayloadEndTimeUTC: new Date(),
    responsePayloadStartTimeUTC: new Date(),
    responsePayloadEndTimeUTC: new Date(),
    serializationStartTimeUTC: new Date(),
    serializationEndTimeUTC: new Date(),
    serializationDurationInMs: 0,
    requestPayloadDurationInMs: 0,
    responsePayloadDurationInMs: 0,
    requestPayloadFlushDurationInMs: 0,
    requestPayloadReadDurationInMs: 0,
    responsePayloadReadDurationInMs: 0,
    requestPayloadFlushStartTimeUTC: new Date(),
    requestPayloadFlushEndTimeUTC: new Date(),
    requestPayloadReadStartTimeUTC: new Date(),
    requestPayloadReadEndTimeUTC: new Date(),
    responsePayloadReadStartTimeUTC: new Date(),
    responsePayloadReadEndTimeUTC: new Date()
  }
});

// Helper function to create a mock container
const createMockContainer = (containerName: string, partitionKey: string): Container => {
  return {
    id: containerName,
    database: {
      id: 'mock-db',
      client: {} as CosmosClientType,
      containers: {
        createIfNotExists: async () => ({
          container: createMockContainer(containerName, partitionKey)
        })
      }
    } as unknown as Database,
    items: {
      query: (_query: string | SqlQuerySpec, _options?: FeedOptions) => ({
        fetchAll: async () => ({
          resources: [],
          hasMoreResults: false,
          requestCharge: 1,
          activityId: 'mock-activity-id',
          continuationToken: '',
          diagnostics: createMockDiagnostics(),
          headers: {},
          continuation: ''
        } as unknown as FeedResponse<unknown>)
      })
    } as unknown as Items,
    read: async (): Promise<ContainerResponse> => ({
      resource: {
        id: containerName,
        _rid: `mock-rid-${containerName}`,
        _self: `dbs/mock-db/colls/${containerName}`,
        _etag: 'mock-etag',
        _ts: Math.floor(Date.now() / 1000),
        _conflicts: '',
        _docs: '',
        _sprocs: '',
        _triggers: '',
        _udfs: '',
        partitionKey: { paths: [partitionKey], version: 2 },
        indexingPolicy: {},
        conflictResolutionPolicy: { mode: 'LastWriterWins' },
        defaultTtl: undefined,
        uniqueKeyPolicy: { uniqueKeys: [] },
        geospatialConfig: { type: 'Geography' } as { type: string },
        clientEncryptionPolicy: undefined,
        computedProperties: undefined,
        analyticalStoreTtl: undefined,
        createThroughput: undefined,
        maxThroughput: undefined,
        self: `dbs/mock-db/colls/${containerName}`,
        rid: `mock-rid-${containerName}`,
        ts: Math.floor(Date.now() / 1000),
        etag: 'mock-etag'
      },
      container: {} as Container,
      statusCode: 200,
      requestCharge: 1,
      activityId: 'mock-activity-id',
      etag: 'mock-etag',
      headers: {},
      diagnostics: createMockDiagnostics(),
      requestDiagnostics: {},
      continuation: ''
    } as unknown as ContainerResponse)
  } as unknown as Container;
};

// Helper function to upsert a record
const upsertRecord = async <T extends CosmosRecord>(
  record: T,
  containerName = 'default'
): Promise<T & { _rid: string; _self: string; _etag: string; _ts: number }> => {
  if (!mockDataStore[containerName]) {
    mockDataStore[containerName] = {};
  }
  
  const id = record.id || String(Date.now());
  const recordWithMetadata = {
    ...record,
    id,
    _rid: `mock-rid-${id}`,
    _self: `dbs/mock-db/colls/${containerName}/docs/${id}`,
    _etag: 'mock-etag',
    _ts: Math.floor(Date.now() / 1000)
  };
  
  mockDataStore[containerName][id] = recordWithMetadata;
  return recordWithMetadata as T & { _rid: string; _self: string; _etag: string; _ts: number };
};

// Helper function to query records
const queryRecords = async <T extends CosmosRecord>(
  _query: string | SqlQuerySpec,
  _parameters: Array<{ name: string; value: unknown }> = [],
  containerName = 'default'
): Promise<T[]> => {
  const container = mockDataStore[containerName] || {};
  return Object.values(container) as T[];
};

// Main mock implementation
export function initializeMockCosmosDB(): MockCosmosDB {
  // Create a mock CosmosClient
  const mockClient: CosmosClientType = {
    database: (id: string) => ({
      id,
      container: (containerId: string) => createMockContainer(containerId, '/id'),
      containers: {
        createIfNotExists: async (body: ContainerRequest) => ({
          container: createMockContainer(body.id || 'default-container', 
            typeof body.partitionKey === 'string' 
              ? body.partitionKey 
              : body.partitionKey?.paths?.[0] || '/id')
        })
      }
    })
  } as unknown as CosmosClientType;

  const mockDb: MockCosmosDB = {
    // Required by AzureCosmosDB
    cosmosClient: mockClient,
    database: {
      id: 'mock-db',
      containers: {
        createIfNotExists: async (body: ContainerRequest) => {
          const partitionKey = typeof body.partitionKey === 'string' 
            ? body.partitionKey 
            : body.partitionKey?.paths?.[0] || '/id';
          return {
            container: createMockContainer(body.id || 'default-container', partitionKey)
          };
        }
      }
    } as unknown as Database,
    
    // Implement AzureCosmosDB methods
    container: async (containerName: string, _partitionKey: string = '/id') => {
      return createMockContainer(containerName, _partitionKey);
    },
    
    upsertRecord: async <T extends CosmosRecord>(record: T, containerName = 'default') => {
      const result = await upsertRecord(record, containerName);
      return {
        resource: result,
        statusCode: 200,
        etag: 'mock-etag',
        item: undefined as any, // Mock item property
        headers: {},
        activityId: 'mock-activity-id',
        requestCharge: 1,
        diagnostics: undefined as any, // Mock diagnostics
      } as ItemResponse<T>;
    },
    
    query: async <T extends CosmosRecord>(
      query: string | SqlQuerySpec, 
      parameters: Array<{ name: string; value: unknown }> = [], 
      containerName = 'default'
    ): Promise<T[]> => {
      return queryRecords<T>(query, parameters, containerName);
    },
    
    getById: async <T extends CosmosRecord>(
      id: string, 
      _partitionKey: string, 
      containerName = 'default'
    ): Promise<T | undefined> => {
      const container = mockDataStore[containerName] || {};
      return container[id] as T | undefined;
    },
    
    deleteRecord: async (
      id: string, 
      _partitionKey: string, 
      containerName = 'default'
    ): Promise<void> => {
      const container = mockDataStore[containerName] || {};
      if (container[id]) {
        delete container[id];
        mockDataStore[containerName] = container;
      }
    },
    
    // Mock-specific methods
    upsert: async <T extends CosmosRecord>(record: T, containerName = 'default') => {
      const result = await upsertRecord(record, containerName);
      return {
        resource: result,
        statusCode: 200,
        etag: 'mock-etag',
        item: undefined as any, // Mock item property
        headers: {},
        activityId: 'mock-activity-id',
        requestCharge: 1,
        diagnostics: undefined as any, // Mock diagnostics
      } as ItemResponse<T>;
    },
    
    delete: async (
      id: string, 
      _partitionKey: string, 
      containerName = 'default'
    ): Promise<boolean> => {
      const container = mockDataStore[containerName] || {};
      if (container[id]) {
        delete container[id];
        mockDataStore[containerName] = container;
        return true;
      }
      return false;
    },
    
    // Mock utilities
    _mocks: {
      upsert: async <T extends CosmosRecord>(record: T, containerName = 'default') => {
        const result = await upsertRecord(record, containerName);
        return {
          resource: result,
          statusCode: 200,
          etag: 'mock-etag',
          item: undefined as any, // Mock item property
          headers: {},
          activityId: 'mock-activity-id',
          requestCharge: 1,
          diagnostics: undefined as any, // Mock diagnostics
        } as ItemResponse<T>;
      },
      
      query: async <T extends CosmosRecord>(
        query: string | SqlQuerySpec, 
        parameters: Array<{ name: string; value: unknown }> = [], 
        containerName = 'default'
      ): Promise<T[]> => {
        return queryRecords<T>(query, parameters, containerName);
      },
      
      getById: async <T extends CosmosRecord>(
        id: string, 
        _partitionKey: string, 
        containerName = 'default'
      ): Promise<T | undefined> => {
        const container = mockDataStore[containerName] || {};
        return container[id] as T | undefined;
      },
      
      delete: async (
        id: string, 
        _partitionKey: string, 
        containerName = 'default'
      ): Promise<boolean> => {
        const container = mockDataStore[containerName] || {};
        if (container[id]) {
          delete container[id];
          mockDataStore[containerName] = container;
          return true;
        }
        return false;
      }
    }
  };
  
  return mockDb;
}

// Export the mock data store for testing purposes
export const _mockDataStore = mockDataStore;
