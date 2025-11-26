import {
  CosmosClient,
  Container,
  Database,
  ItemResponse,
  SqlQuerySpec,
  type CosmosClientOptions,
  type SqlParameter,
  type ContainerDefinition,
  type DatabaseResponse
} from '@azure/cosmos';
import { AZURE_CONFIG } from '../../config/azure-config.js';
import { logger } from '../../utils/logger.js';
import type { 
  ContainerConfig,
  ImportMetadata,
  DataRow,
  ApiKey,
  AuditLog
} from '../../types/cosmos-models.js';

/**
 * Enhanced Cosmos DB service with better data modeling
 */
export class EnhancedCosmosDBService {
  private cosmosClient: CosmosClient;
  private database!: Database; // Will be initialized in init()
  private containers: Map<string, Container> = new Map();

  constructor() {
    // Configure client options with retry policy
    const clientOptions: CosmosClientOptions = {
      endpoint: AZURE_CONFIG.cosmos.endpoint,
      key: AZURE_CONFIG.cosmos.key,
      connectionPolicy: {
        enableEndpointDiscovery: true,
        preferredLocations: ['East US'],
        retryOptions: {
          maxRetryAttemptCount: 5,
          maxWaitTimeInSeconds: 10,
          fixedRetryIntervalInMilliseconds: 0 // Auto-calculate retry interval
        },
      },
    };

    this.cosmosClient = new CosmosClient(clientOptions);
  }

  /**
   * Initialize the Cosmos DB service
   */
  async init(): Promise<void> {
    const { 
      endpoint, 
      key, 
      databaseName
    } = AZURE_CONFIG.cosmos;

    if (!endpoint || !key) {
      const errorMsg = 'Azure Cosmos DB endpoint and key must be configured. ' +
        `Endpoint: ${endpoint ? 'provided' : 'missing'}, ` +
        `Key: ${key ? 'provided' : 'missing'}`;
      
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      // First, check if the database exists or create it
      logger.debug('Initializing Cosmos DB client with config:', {
        endpoint: endpoint ? 'provided' : 'missing',
        key: key ? 'provided' : 'missing',
        databaseName
      });
      
      const databaseResponse: DatabaseResponse = await this.cosmosClient.databases.createIfNotExists({ 
        id: databaseName 
      });
      
      this.database = databaseResponse.database;
      
      if (!this.database) {
        throw new Error('Failed to get database instance from the response');
      }
      
      logger.info(`Database ${databaseName} is ready`, {
        databaseId: this.database.id
      });
      
      // Initialize containers
      await this.initializeContainers();
    } catch (error) {
      logger.error('Failed to initialize Cosmos DB:', error);
      throw new Error(`Failed to initialize Cosmos DB: ${(error as Error).message}`);
    }
  }

  /**
   * Initialize all required containers with proper partition keys
   */
  private async initializeContainers(): Promise<void> {
    const containerConfigs: ContainerConfig[] = [
      {
        name: 'imports',
        partitionKey: '/importId'
      },
      {
        name: 'data',
        partitionKey: '/importId'
      },
      {
        name: 'api-keys',
        partitionKey: '/userId'
      },
      {
        name: 'audit-logs',
        partitionKey: '/userId'
      }
    ];

    for (const config of containerConfigs) {
      try {
        logger.debug(`Initializing container ${config.name} with partition key ${config.partitionKey}`);
        
        const containerDefinition: ContainerDefinition = {
          id: config.name,
          partitionKey: { 
            paths: [config.partitionKey],
            version: 2
          }
        };
        
        const { container } = await this.database.containers.createIfNotExists(containerDefinition);
        this.containers.set(config.name, container);
        
        logger.info(`Container ${config.name} is ready`);
      } catch (error) {
        logger.error(`Failed to initialize container ${config.name}:`, error);
        throw new Error(`Failed to initialize container ${config.name}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get a reference to a container
   */
  private getContainer(containerName: string): Container {
    const container = this.containers.get(containerName);
    if (!container) {
      throw new Error(`Container ${containerName} not initialized`);
    }
    return container;
  }

  /**
   * Get a reference to a Cosmos DB container
   * @param containerName - The name of the container
   * @param partitionKey - The partition key path
   * @returns Promise<AzureContainer> - A promise that resolves to the container
   */
  async container(containerName: string, partitionKey: string): Promise<Container> {
    try {
      // First, check if it's one of our predefined containers
      if (this.containers.has(containerName)) {
        return this.getContainer(containerName);
      }

      // If not predefined, try to access an existing container directly
      logger.info(`Accessing existing container: ${containerName}`);
      try {
        const container = this.database.container(containerName);
        // Test if container exists by reading its properties (this will throw if it doesn't exist)
        await container.read();
        logger.info(`Successfully accessed existing container: ${containerName}`);
        return container;
      } catch (readError) {
        logger.info(`Container ${containerName} does not exist (${readError instanceof Error ? readError.message : 'error occurred'}), attempting to create with partitionKey: ${partitionKey}`);
        // Container doesn't exist, so create it
        const containerDefinition: ContainerDefinition = {
          id: containerName,
          partitionKey: {
            paths: [partitionKey],
            version: 2
          }
        };

        // Add specific indexing policy for excel-records container to optimize common queries
        if (containerName === 'excel-records') {
          containerDefinition.indexingPolicy = {
            includedPaths: [
              {
                path: "/*" // Include all paths by default
              },
              // Add specific paths for the special filter fields to optimize queries
              {
                path: "/Source/?"
              },
              {
                path: "/Category/?"
              },
              {
                path: "/\"Sub Category\"/?"
              },
              {
                path: "/Year/?"
              }
            ],
            excludedPaths: [
              {
                path: "/\"_etag\"/?" // Exclude system properties that are not needed for queries
              }
            ],
            indexingMode: "consistent", // Consistent indexing for real-time query results
            automatic: true // Automatically index all properties
          };
        }
        
        const { container } = await this.database.containers.createIfNotExists(containerDefinition);
        logger.info(`Successfully created container: ${containerName}`);
        return container;
      }
    } catch (error) {
      logger.error(`Error getting/creating container ${containerName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new import metadata record
   */
  async createImport(importMetadata: Omit<ImportMetadata, 'id' | 'createdAt' | 'documentType' | '_partitionKey'>): Promise<ItemResponse<ImportMetadata>> {
    const record: ImportMetadata = {
      id: `import_${importMetadata.importId}`,
      _partitionKey: importMetadata.importId,
      createdAt: new Date().toISOString(),
      documentType: 'import',
      ...importMetadata
    };

    const container = this.getContainer('imports');
    return await container.items.create(record);
  }

  /**
   * Update import metadata
   */
  async updateImport(importId: string, updates: Partial<ImportMetadata>): Promise<ItemResponse<ImportMetadata>> {
    const container = this.getContainer('imports');
    const { resource } = await container.item(`import_${importId}`, importId).read<ImportMetadata>();
    
    if (!resource) {
      throw new Error(`Import with ID ${importId} not found`);
    }

    const updatedRecord: ImportMetadata = {
      ...resource,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return await container.item(`import_${importId}`, importId).replace(updatedRecord);
  }

  /**
   * Get import metadata by ID
   */
  async getImport(importId: string): Promise<ImportMetadata | undefined> {
    const container = this.getContainer('imports');
    try {
      const { resource } = await container.item(`import_${importId}`, importId).read<ImportMetadata>();
      return resource || undefined;
    } catch (error: unknown) {
      const cosmosError = error as { code?: number };
      if (cosmosError.code === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * List imports with pagination
   */
  async listImports(options: {
    limit?: number;
    offset?: number;
    status?: ImportMetadata['status'];
  } = {}): Promise<{ items: ImportMetadata[]; total: number }> {
    const { limit = 50, offset = 0, status } = options;
    
    const container = this.getContainer('imports');
    
    let query = 'SELECT * FROM c WHERE c.documentType = @documentType';
    const parameters: SqlParameter[] = [
      { name: '@documentType', value: 'import' }
    ];
    
    if (status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: status });
    }
    
    query += ' ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
    parameters.push(
      { name: '@offset', value: offset },
      { name: '@limit', value: limit }
    );
    
    const querySpec: SqlQuerySpec = { query, parameters };
    // Use iterator instead of fetchAll to avoid loading all results into memory
    const queryIterator = container.items.query<ImportMetadata>(querySpec);
    const items: ImportMetadata[] = [];
    
    while (queryIterator.hasMoreResults()) {
      const result = await queryIterator.fetchNext();
      if (result.resources) {
        items.push(...result.resources);
      }
    }
    
    // Get total count
    const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.documentType = @documentType' + 
      (status ? ' AND c.status = @status' : '');
    const countParameters = [
      { name: '@documentType', value: 'import' },
      ...(status ? [{ name: '@status', value: status }] : [])
    ];
    
    const countQuerySpec: SqlQuerySpec = { 
      query: countQuery, 
      parameters: countParameters 
    };
    // Use iterator for count query as well
    const countIterator = container.items.query(countQuerySpec);
    const countResult = await countIterator.fetchNext();
    const total = countResult.resources && countResult.resources.length > 0 ? countResult.resources[0] : 0;
    
    return { items, total };
  }

  /**
   * Create data rows
   */
  async createDataRows(rows: Omit<DataRow, 'id' | 'createdAt' | 'documentType' | '_partitionKey'>[]): Promise<ItemResponse<DataRow>[]> {
    const container = this.getContainer('data');
    
    const batch: DataRow[] = rows.map(row => {
      const baseRow: DataRow = {
        id: `row_${row.importId as string}_${row.rowNumber as number}`,
        _partitionKey: row.importId as string,
        createdAt: new Date().toISOString(),
        documentType: 'data',
        importId: row.importId as string,
        rowNumber: row.rowNumber as number,
        importedAt: (row.importedAt as string) || new Date().toISOString(),
        importedBy: (row.importedBy as string) || 'system',
        ...row
      };
      return baseRow;
    });
    
    // Cosmos DB has a batch limit of 100 operations
    const BATCH_SIZE = 100;
    const results: ItemResponse<DataRow>[] = [];
    
    for (let i = 0; i < batch.length; i += BATCH_SIZE) {
      const batchChunk = batch.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batchChunk.map(item => container.items.create(item))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Query data rows by import ID
   */
  async queryDataByImport(importId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: DataRow[]; total: number }> {
    const { limit = 100, offset = 0 } = options;
    
    const container = this.getContainer('data');
    
    const query = 'SELECT * FROM c WHERE c.documentType = @documentType AND c.importId = @importId ORDER BY c.rowNumber OFFSET @offset LIMIT @limit';
    const parameters: SqlParameter[] = [
      { name: '@documentType', value: 'data' },
      { name: '@importId', value: importId },
      { name: '@offset', value: offset },
      { name: '@limit', value: limit }
    ];
    
    const querySpec: SqlQuerySpec = { query, parameters };
    // Use iterator instead of fetchAll to avoid loading all results into memory
    const queryIterator = container.items.query<DataRow>(querySpec);
    const items: DataRow[] = [];
    
    while (queryIterator.hasMoreResults()) {
      const result = await queryIterator.fetchNext();
      if (result.resources) {
        items.push(...result.resources);
      }
    }
    
    // Get total count
    const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.documentType = @documentType AND c.importId = @importId';
    const countParameters: SqlParameter[] = [
      { name: '@documentType', value: 'data' },
      { name: '@importId', value: importId }
    ];
    
    const countQuerySpec: SqlQuerySpec = { query: countQuery, parameters: countParameters };
    // Use iterator for count query as well
    const countIterator = container.items.query(countQuerySpec);
    const countResult = await countIterator.fetchNext();
    const total = countResult.resources && countResult.resources.length > 0 ? countResult.resources[0] : 0;
    
    return { items, total };
  }

  /**
   * Create an API key
   */
  async createApiKey(apiKey: Omit<ApiKey, 'id' | 'createdAt' | 'documentType' | '_partitionKey'>): Promise<ItemResponse<ApiKey>> {
    const record: ApiKey = {
      id: `key_${Date.now()}`,
      _partitionKey: apiKey.userId,
      createdAt: new Date().toISOString(),
      documentType: 'api-key',
      ...apiKey
    };

    const container = this.getContainer('api-keys');
    return await container.items.create(record);
  }

  /**
   * Get API key by hash
   */
  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const container = this.getContainer('api-keys');
    
    const query = 'SELECT * FROM c WHERE c.documentType = @documentType AND c.keyHash = @keyHash AND c.isActive = true';
    const parameters: SqlParameter[] = [
      { name: '@documentType', value: 'api-key' },
      { name: '@keyHash', value: keyHash }
    ];
    
    const querySpec: SqlQuerySpec = { query, parameters };
    // Use iterator instead of fetchAll to avoid loading all results into memory
    const queryIterator = container.items.query<ApiKey>(querySpec);
    const result = await queryIterator.fetchNext();
    const resources: ApiKey[] = result.resources || [];
    
    return resources[0];
  }

  /**
   * Update API key
   */
  async updateApiKey(id: string, userId: string, updates: Partial<ApiKey>): Promise<ItemResponse<ApiKey>> {
    const container = this.getContainer('api-keys');
    const { resource } = await container.item(id, userId).read<ApiKey>();
    
    if (!resource) {
      throw new Error(`API key with ID ${id} not found`);
    }

    const updatedRecord: ApiKey = {
      ...resource,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return await container.item(id, userId).replace(updatedRecord);
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(auditLog: Omit<AuditLog, 'id' | 'createdAt' | 'documentType' | '_partitionKey'>): Promise<ItemResponse<AuditLog>> {
    const record: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      _partitionKey: auditLog.userId || 'system',
      createdAt: new Date().toISOString(),
      documentType: 'audit-log',
      ...auditLog
    };

    const container = this.getContainer('audit-logs');
    return await container.items.create(record);
  }

  /**
   * Query audit logs by user ID
   */
  async queryAuditLogsByUser(userId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: AuditLog[]; total: number }> {
    const { limit = 50, offset = 0 } = options;
    
    const container = this.getContainer('audit-logs');
    
    const query = 'SELECT * FROM c WHERE c.documentType = @documentType AND c.userId = @userId ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit';
    const parameters: SqlParameter[] = [
      { name: '@documentType', value: 'audit-log' },
      { name: '@userId', value: userId },
      { name: '@offset', value: offset },
      { name: '@limit', value: limit }
    ];
    
    const querySpec: SqlQuerySpec = { query, parameters };
    // Use iterator instead of fetchAll to avoid loading all results into memory
    const queryIterator = container.items.query<AuditLog>(querySpec);
    const items: AuditLog[] = [];
    
    while (queryIterator.hasMoreResults()) {
      const result = await queryIterator.fetchNext();
      if (result.resources) {
        items.push(...result.resources);
      }
    }
    
    // Get total count
    const countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.documentType = @documentType AND c.userId = @userId';
    const countParameters: SqlParameter[] = [
      { name: '@documentType', value: 'audit-log' },
      { name: '@userId', value: userId }
    ];
    
    const countQuerySpec: SqlQuerySpec = { query: countQuery, parameters: countParameters };
    // Use iterator for count query as well
    const countIterator = container.items.query(countQuerySpec);
    const countResult = await countIterator.fetchNext();
    const total = countResult.resources && countResult.resources.length > 0 ? countResult.resources[0] : 0;
    
    return { items, total };
  }
}

// Export a singleton instance
export const enhancedCosmosDBService = new EnhancedCosmosDBService();