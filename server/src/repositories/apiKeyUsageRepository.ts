import { AzureCosmosDB } from '../config/azure';
import { v4 as uuidv4 } from 'uuid';

interface ApiKeyUsageRecord {
  id: string;
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
  ttl?: number; // Time to live in seconds (for automatic expiration)
}

export class ApiKeyUsageRepository {
  private containerId = 'apiKeyUsage';
  private partitionKey = '/apiKeyId';
  private ttlInDays: number;
  private cosmosDb: AzureCosmosDB;

  constructor(cosmosDb: AzureCosmosDB) {
    this.cosmosDb = cosmosDb;
    // Default to 30 days retention for usage records
    this.ttlInDays = parseInt(process.env.API_KEY_USAGE_RETENTION_DAYS || '30', 10);
  }

  /**
   * Records API key usage in Cosmos DB
   */
  async recordUsage(params: {
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
      const container = await this.cosmosDb.getContainer(this.containerId, this.partitionKey);
      
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
      };

      await container.items.create(record);
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to record API key usage:', error);
      // Consider adding error reporting here
    }
  }

  /**
   * Gets usage statistics for an API key
   */
  async getUsageStats(apiKeyId: string, timeRange: '24h' | '7d' | '30d' = '7d') {
    try {
      const container = await this.cosmosDb.getContainer(this.containerId, this.partitionKey);
      
      // Calculate time range
      const now = new Date();
      let fromDate = new Date(now);
      
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

      // Query for usage records
      const query = {
        query: 'SELECT * FROM c WHERE c.apiKeyId = @apiKeyId AND c.timestamp >= @fromDate',
        parameters: [
          { name: '@apiKeyId', value: apiKeyId },
          { name: '@fromDate', value: fromDate.toISOString() },
        ],
      };

      const { resources: records } = await container.items.query(query).fetchAll();
      
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

      records.forEach(record => {
        // Count by status code
        stats.byStatusCode[record.statusCode] = (stats.byStatusCode[record.statusCode] || 0) + 1;
        
        // Count by endpoint
        const endpoint = `${record.method} ${record.path}`;
        stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;
        
        // Count by day
        const day = record.timestamp.split('T')[0];
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
      const container = await this.cosmosDb.getContainer(this.containerId, this.partitionKey);
      
      const query = {
        query: 'SELECT TOP @limit * FROM c WHERE c.apiKeyId = @apiKeyId ORDER BY c.timestamp DESC',
        parameters: [
          { name: '@apiKeyId', value: apiKeyId },
          { name: '@limit', value: limit },
        ],
      };

      const { resources: records } = await container.items.query(query).fetchAll();
      return records;
    } catch (error) {
      console.error('Failed to get recent activity:', error);
      throw error;
    }
  }
}
