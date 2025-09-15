// Data models for Cosmos DB collections

/**
 * Base interface for all Cosmos DB documents
 */
export interface CosmosDocument {
  id: string;
  _partitionKey: string;
  createdAt: string;
  updatedAt?: string;
  documentType: string;
  userId?: string;
}

/**
 * Import metadata document
 * Stored in the 'imports' container with partition key '/importId'
 */
export interface ImportMetadata extends CosmosDocument {
  documentType: 'import';
  importId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: string;
  processedBy: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  headers: string[];
  errors?: Array<{
    row: number;
    error: string;
    rawData?: unknown;
  }>;
  blobUrl?: string;
}

/**
 * Data row document
 * Stored in the 'data' container with partition key '/importId'
 */
export interface DataRow extends CosmosDocument {
  documentType: 'data';
  importId: string;
  rowNumber: number;
  importedAt: string;
  importedBy: string;
  [key: string]: unknown; // Dynamic properties from the Excel/CSV file
}

/**
 * API key document
 * Stored in the 'api-keys' container with partition key '/userId'
 */
export interface ApiKey extends CosmosDocument {
  documentType: 'api-key';
  userId: string;
  keyHash: string;
  name: string;
  isActive: boolean;
  lastUsedAt?: string;
  lastUsedFromIp?: string;
  expiresAt?: string;
  allowedIps?: string[];
}

/**
 * Audit log document
 * Stored in the 'audit-logs' container with partition key '/userId'
 */
export interface AuditLog extends CosmosDocument {
  documentType: 'audit-log';
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

/**
 * Container configuration
 */
export interface ContainerConfig {
  name: string;
  partitionKey: string;
  throughput?: number;
  indexingPolicy?: Record<string, unknown>;
}