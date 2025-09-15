import { enhancedCosmosDBService } from '../cosmos-db/enhanced-cosmos-db.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Security audit logging service
 */
class AuditLogService {
  /**
   * Log an authentication event
   */
  async logAuthEvent(params: {
    userId: string;
    action: 'login' | 'logout' | 'failed_login' | 'token_refresh';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await enhancedCosmosDBService.createAuditLog({
        userId: params.userId,
        action: params.action,
        resource: 'auth',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: params.details
      });
    } catch (error) {
      logger.error('Failed to log auth event', { error });
    }
  }

  /**
   * Log an API key event
   */
  async logApiKeyEvent(params: {
    userId: string;
    action: 'create' | 'revoke' | 'use' | 'failed_use';
    apiKeyId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await enhancedCosmosDBService.createAuditLog({
        userId: params.userId,
        action: params.action,
        resource: 'api-key',
        resourceId: params.apiKeyId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: params.details
      });
    } catch (error) {
      logger.error('Failed to log API key event', { error });
    }
  }

  /**
   * Log a file upload event
   */
  async logFileUploadEvent(params: {
    userId: string;
    action: 'upload' | 'process_start' | 'process_complete' | 'process_error';
    importId?: string;
    fileName?: string;
    fileSize?: number;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await enhancedCosmosDBService.createAuditLog({
        userId: params.userId,
        action: params.action,
        resource: 'file-upload',
        resourceId: params.importId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: {
          fileName: params.fileName,
          fileSize: params.fileSize,
          ...params.details
        }
      });
    } catch (error) {
      logger.error('Failed to log file upload event', { error });
    }
  }

  /**
   * Log a data access event
   */
  async logDataAccessEvent(params: {
    userId: string;
    action: 'query' | 'export' | 'delete';
    resourceId?: string;
    query?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await enhancedCosmosDBService.createAuditLog({
        userId: params.userId,
        action: params.action,
        resource: 'data',
        resourceId: params.resourceId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: {
          query: params.query,
          ...params.details
        }
      });
    } catch (error) {
      logger.error('Failed to log data access event', { error });
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(userId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: any[]; total: number }> {
    try {
      return await enhancedCosmosDBService.queryAuditLogsByUser(userId, options);
    } catch (error) {
      logger.error('Failed to get user audit logs', { error });
      throw error;
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(resourceId: string, _options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: any[]; total: number }> {
    try {
      // This would require a different query implementation in the Cosmos DB service
      // For now, we'll just return an empty result
      return { items: [], total: 0 };
    } catch (error) {
      logger.error('Failed to get resource audit logs', { error });
      throw error;
    }
  }
}

// Export a singleton instance
export const auditLogService = new AuditLogService();