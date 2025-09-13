import { v4 as uuidv4 } from 'uuid';

// Import types from the types index file
import type { 
  AzureCosmosDB, 
  CosmosRecord, 
  AzureBlobStorage
} from '../types/azure.js';

/**
 * Represents an API key usage record in Cosmos DB
 */
interface ApiKeyUsageRecord extends CosmosRecord {
  id: string; // Required for Cosmos DB
  
  apiKeyId: string;
  userId: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  userAgent?: string;
  responseTime: number;
  metadata?: Record<string, unknown>;
  ttl: number; // Time to live in seconds (for automatic expiration)
}

export class ApiKeyUsageRepository {
  private containerId = 'apiKeyUsage';
  private partitionKey = '/apiKeyId';
  private ttlInDays: number;
  private cosmosDb: AzureCosmosDB;

  constructor(azureServices: { cosmosDb: AzureCosmosDB; blobStorage: AzureBlobStorage }) {
    this.cosmosDb = azureServices.cosmosDb;
    // Default to 30 days retention for usage records
    this.ttlInDays = parseInt(process.env.API_KEY_USAGE_RETENTION_DAYS || '30', 10);
  }

  /**
   * Records API key usage in Cosmos DB
   */
  async logUsage(params: {
    apiKeyId: string;
    userId: string;
    method: string;
    path: string;
    statusCode: number;
    ipAddress: string;
    userAgent?: string;
    responseTime: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      // Create the record to be inserted
      const record: ApiKeyUsageRecord = {
        id: uuidv4(),
        apiKeyId: params.apiKeyId,
        userId: params.userId,
        timestamp: new Date().toISOString(),
        method: params.method,
        path: params.path,
        statusCode: params.statusCode,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        responseTime: params.responseTime,
        metadata: params.metadata,
        ttl: this.ttlInDays * 24 * 60 * 60, // Convert days to seconds
        // Ensure we have a partition key value
        [this.partitionKey.replace(/^\//, '')]: params.apiKeyId
      };

      // Use the upsertRecord method from AzureCosmosDB interface
      await this.cosmosDb.upsertRecord(record);
    } catch (error) {
      console.error('Failed to log API key usage:', error);
      // Don't throw - we don't want to break the request if logging fails
    }
  }

  /**
   * Gets usage statistics for an API key
   */
  async getUsageStats(apiKeyId: string, timeRange: '24h' | '7d' | '30d' = '7d') {
    try {
      // Calculate time range
      const now = new Date();
      const fromDate = new Date(now);
      
      switch (timeRange) {
        case '24h':
          fromDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          fromDate.setDate(now.getDate() - 7);
          break;
        case '30d':
        default:
          fromDate.setDate(now.getDate() - 30);
          break;
      }

      // Query for usage records using the AzureCosmosDB interface
      const query = 'SELECT * FROM c WHERE c.apiKeyId = @apiKeyId AND c.timestamp >= @fromDate';
      const parameters = [
        { name: '@apiKeyId', value: apiKeyId },
        { name: '@fromDate', value: fromDate.toISOString() },
      ];

      const records = await this.cosmosDb.query<ApiKeyUsageRecord>(query, parameters);
      
      // Calculate basic statistics
      const stats = {
        totalRequests: records.length,
        successRate: 0,
        avgResponseTime: 0,
        byStatusCode: {} as Record<number, number>,
        byEndpoint: {} as Record<string, number>,
        byDay: {} as Record<string, number>,
      };

      if (records.length === 0) {
        return stats;
      }

      let totalResponseTime = 0;
      let successCount = 0;

      records.forEach((record: ApiKeyUsageRecord) => {
        // Count by status code
        stats.byStatusCode[record.statusCode] = (stats.byStatusCode[record.statusCode] || 0) + 1;
        
        // Count by endpoint
        const method = record.method || '';
        const path = record.path || '';
        const endpoint = `${method} ${path}` || 'unknown';
        stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;
        
        // Count by day
        const timestamp = record.timestamp || '';
        const dayParts = timestamp.split('T');
        const day = dayParts[0] || 'unknown';
        stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        
        // Track success rate (2xx status codes)
        if (record.statusCode >= 200 && record.statusCode < 300) {
          successCount++;
        }
        
        // Sum response times
        totalResponseTime += record.responseTime || 0;
      });

      // Calculate averages
      stats.successRate = (successCount / records.length) * 100;
      stats.avgResponseTime = totalResponseTime / records.length;

      return stats;
    } catch (error) {
      console.error('Failed to get API key usage stats:', error);
      throw error;
    }
  }

  /**
   * Gets recent activity for an API key
   */
  async getRecentActivity(apiKeyId: string, limit = 50) {
    try {
      // Query for recent activity using the AzureCosmosDB interface
      const query = 'SELECT TOP @limit * FROM c WHERE c.apiKeyId = @apiKeyId ORDER BY c.timestamp DESC';
      const parameters = [
        { name: '@apiKeyId', value: apiKeyId },
        { name: '@limit', value: limit },
      ];

      const records = await this.cosmosDb.query<ApiKeyUsageRecord>(query, parameters);
      return records;
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      throw error;
    }
  }
}
