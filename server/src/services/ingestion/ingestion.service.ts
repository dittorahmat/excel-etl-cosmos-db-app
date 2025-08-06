import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import { fileParserService } from '../file-parser/file-parser.service.js';
import { initializeCosmosDB } from '../cosmos-db/cosmos-db.service.js';
import type { AzureCosmosDB } from '../../types/azure.js';
import { uploadToBlobStorage } from '../blob-storage/upload-to-blob-storage.js';
import type { CosmosRecord } from '../../types/azure.js';
import fs from 'fs/promises';

/**
 * Extended CosmosRecord with required fields for import metadata
 */
export interface ImportMetadata extends CosmosRecord {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'processing' | 'completed' | 'failed';
  processedAt: string;
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
  _partitionKey: string; // Ensure partition key is required
  _rid?: string;
  _ts?: number;
  _self?: string;
  _etag?: string;
}

/**
 * Extended CosmosRecord with required fields for row data
 */
export interface RowData extends CosmosRecord {
  id: string; // Required by CosmosRecord
  _importId: string;
  _rowNumber: number;
  _importedAt: string;
  _importedBy: string;
  _rid?: string;
  _ts?: number;
  _self?: string;
  _etag?: string;
  [key: string]: unknown; // Allow dynamic properties
}

export class IngestionService {
  private logger = logger.child({ module: 'ingestion-service' });
  private readonly metadataContainerName = 'excel-records';
  private readonly dataContainerName = 'excel-records';
  private readonly metadataPartitionKey = 'imports';

  /**
   * Process and import a file into Cosmos DB
   */
  async importFile(
    filePath: string,
    fileName: string,
    fileType: string,
    userId: string
  ): Promise<ImportMetadata> {
    const importId = `import_${uuidv4()}`;
    const importStartTime = new Date();
    let blobUrl = '';
    
    this.logger.info('Starting file import', {
      importId,
      fileName,
      fileType,
      filePath,
      userId,
      timestamp: importStartTime.toISOString()
    });

    // Read file from disk to get its size and for blob upload
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(filePath);
      this.logger.debug('File read successfully', {
        importId,
        filePath,
        fileSize: fileBuffer.length,
        fileExists: true
      });
    } catch (error) {
      this.logger.error('Failed to read file', {
        importId,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fileExists: await fs.access(filePath).then(() => true).catch(() => false)
      });
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    const fileSize = fileBuffer.length;

    const importMetadata: ImportMetadata = {
      id: importId,
      fileName,
      fileType,
      fileSize,
      status: 'processing',
      processedAt: importStartTime.toISOString(),
      processedBy: userId,
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      headers: [],
      errors: [],
      _partitionKey: 'imports',
      _ts: Math.floor(Date.now() / 1000),
    };

    const cosmosDb = await initializeCosmosDB();

    // Save initial import metadata
    await this.saveImportMetadata(importMetadata, cosmosDb);

    try {
      // Upload the original file to blob storage
      this.logger.info('Uploading file to blob storage', { 
        importId,
        fileName, 
        fileType, 
        fileSize: fileBuffer.length 
      });
      
      try {
        // Use the original filename without the import ID prefix
        blobUrl = await uploadToBlobStorage(fileBuffer, fileName, fileType);
        this.logger.info('File uploaded to blob storage successfully', { 
          importId,
          fileName, 
          fileType,
          blobUrl: blobUrl ? 'URL received' : 'No URL returned',
          blobUrlLength: blobUrl?.length || 0
        });
      } catch (error) {
        this.logger.error('Failed to upload file to blob storage', {
          importId,
          fileName,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        throw new Error(`Failed to upload file to blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Update metadata with blob URL
      importMetadata['blobUrl'] = blobUrl;

      // Parse the file
      this.logger.info('Starting file parsing', {
        importId,
        filePath,
        fileType,
        fileSize: fileBuffer.length
      });
      
      let parseResult;
      try {
        parseResult = await fileParserService.parseFile(filePath, fileType, {
        transformRow: (row, rowIndex) => {
          // Add system fields to each row
          return {
            ...row,
            _importId: importId,
            _rowNumber: (rowIndex + 1).toString(), // 1-based index for user-friendly reporting
            _importedAt: new Date().toISOString(),
            _importedBy: userId,
          };
        },
        });
      } catch (parseError) {
        this.logger.error('Failed to parse file', {
          importId,
          filePath,
          fileType,
          error: parseError instanceof Error ? parseError.message : 'Unknown error',
          stack: parseError instanceof Error ? parseError.stack : undefined
        });
        throw new Error(`Failed to parse file: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
      this.logger.info('File parsing completed', {
        importId,
        totalRows: parseResult.totalRows,
        validRows: parseResult.validRows,
        errorRows: parseResult.errors.length,
        headers: parseResult.headers
      });

      // Update metadata with parse results
      importMetadata.headers = parseResult.headers;
      importMetadata.totalRows = parseResult.totalRows;
      importMetadata.validRows = parseResult.validRows;
      importMetadata.errorRows = parseResult.errors.length;
      importMetadata.errors = parseResult.errors;
      
      if (parseResult.errors.length > 0) {
        this.logger.warn('Parse completed with errors', {
          importId,
          errorCount: parseResult.errors.length,
          firstFewErrors: parseResult.errors.slice(0, 5) // Log first 5 errors to avoid log flooding
        });
      }

      if (parseResult.rows.length > 0) {
        this.logger.info('Saving rows to Cosmos DB', {
          importId,
          rowCount: parseResult.rows.length,
          firstRowId: parseResult.rows[0]?._rowNumber,
          lastRowId: parseResult.rows[parseResult.rows.length - 1]?._rowNumber
        });
        
        try {
          await this.saveRows(parseResult.rows as RowData[], cosmosDb);
          this.logger.info('Successfully saved rows to Cosmos DB', {
            importId,
            rowCount: parseResult.rows.length
          });
        } catch (error) {
          this.logger.error('Failed to save rows to Cosmos DB', {
            importId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            rowCount: parseResult.rows.length
          });
          throw error;
        }
      } else {
        this.logger.warn('No rows to save to Cosmos DB', { importId });
      }

      // Update import status to completed
      importMetadata.status = 'completed';
      await this.saveImportMetadata(importMetadata, cosmosDb);

      this.logger.info('File import completed successfully', {
        importId,
        fileName,
        validRows: importMetadata.validRows,
        errorRows: importMetadata.errorRows,
      });

      return importMetadata;
    } catch (error) {
      // Update import status to failed
      importMetadata.status = 'failed';
      importMetadata.errors = [
        ...(importMetadata.errors || []),
        {
          row: 0,
          error: error instanceof Error ? error.message : 'Unknown error during import',
        },
      ];

      await this.saveImportMetadata(importMetadata, cosmosDb).catch((saveError) => {
        this.logger.error('Failed to save failed import metadata', {
          importId,
          error: saveError,
        });
      });

      this.logger.error('File import failed', {
        importId,
        fileName,
        error,
      });

      throw error;
    }
  }

  /**
   * Save import metadata to Cosmos DB
   */
  private async saveImportMetadata(metadata: ImportMetadata, cosmosDb: AzureCosmosDB): Promise<void> {
    try {
      const record = {
        ...metadata,
        id: `import_${metadata.id}`, // Prefix to distinguish from row documents
        _partitionKey: this.metadataPartitionKey, // Use fixed partition key for metadata
        documentType: 'excel-import', // Add document type for filtering
        _importId: metadata.id, // Add _importId for consistency with row documents
      };
      
      this.logger.debug('Saving import metadata', { 
        importId: metadata.id,
        container: this.metadataContainerName,
        record: {
          ...record,
          // Don't log the entire file content
          fileBuffer: '[Buffer]',
        }
      });
      
      const result = await cosmosDb.upsertRecord(
        record,
        this.metadataContainerName
      );
      
      this.logger.debug('Import metadata saved', { 
        importId: metadata.id,
        etag: result.resource?._etag,
        partitionKey: this.metadataPartitionKey
      });
    } catch (error) {
      this.logger.error('Failed to save import metadata', {
        importId: metadata.id,
        error,
      });
      throw new Error(`Failed to save import metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save rows to Cosmos DB in batches
   */
  private async saveRows(rows: RowData[], cosmosDb: AzureCosmosDB): Promise<void> {
    if (rows.length === 0) {
      this.logger.debug('No rows to save');
      return;
    }

    const BATCH_SIZE = 100; // Cosmos DB batch limit
    const importId = rows[0]?._importId;

    if (!importId) {
      const error = new Error('No import ID found in row data');
      this.logger.error('Missing import ID in row data', { 
        firstRow: JSON.stringify(rows[0], null, 2),
        error: error.message 
      });
      throw error;
    }

    this.logger.info(`Starting to save ${rows.length} rows for import ${importId}`, {
      importId,
      container: this.dataContainerName,
      batchCount: Math.ceil(rows.length / BATCH_SIZE),
      firstRowKeys: rows[0] ? Object.keys(rows[0]) : []
    });

    try {
      // Process rows in batches
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        // Execute batch operations
        const results = await Promise.allSettled(
          batch.map((row) => {
            const record = {
              ...row,
              // Use a composite ID to ensure uniqueness
              id: `row_${row._importId}_${row._rowNumber}`,
              _partitionKey: `import_${row._importId}`, // Match the import's partition key
              _rowId: row._rowNumber, // Store row number for easier querying
              documentType: 'excel-row', // Add document type for easier querying
            };
            
            // Log the row being processed
            const rowLogData = {
              rowId: record.id,
              partitionKey: record._partitionKey,
              importId: row._importId,
              rowNumber: row._rowNumber,
              keys: Object.keys(record)
            };
            this.logger.debug(`Upserting row ${row._rowNumber} for import ${row._importId}`, rowLogData);
            
            // Execute the upsert operation
            return cosmosDb.upsertRecord(record).then(result => {
              this.logger.debug(`Successfully upserted row ${row._rowNumber}`, {
                rowId: record.id,
                statusCode: result.statusCode,
                etag: result.etag
              });
              return result;
            });
          })
        );

        // Log any failed operations
        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        if (failed.length > 0) {
          const errorDetails = failed.map((f, idx) => {
            const errorInfo = f.reason instanceof Error 
              ? {
                  message: f.reason.message,
                  stack: f.reason.stack,
                  name: f.reason.name,
                  code: (f.reason as Error & { code?: string }).code
                }
              : { message: String(f.reason) };
            
            return {
              index: idx,
              error: errorInfo
            };
          });
          
          this.logger.error(`Failed to save ${failed.length} rows in batch ${i / BATCH_SIZE + 1}`, {
            importId,
            batchIndex: i / BATCH_SIZE + 1,
            totalBatches: Math.ceil(rows.length / BATCH_SIZE),
            failedCount: failed.length,
            successCount: results.length - failed.length,
            errors: errorDetails,
            sampleError: errorDetails[0] // Include first error as sample
          });
          
          throw new Error(`Failed to save ${failed.length} rows in batch ${i / BATCH_SIZE + 1}: ${errorDetails[0]?.error?.message || 'Unknown error'}`);
        }

        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
      const batchEnd = Math.min(i + BATCH_SIZE, rows.length);
      
      this.logger.info(`Processed batch ${batchNumber} of ${totalBatches}`, {
        importId,
        batchNumber,
        totalBatches,
        batchStart: i + 1,
        batchEnd,
        batchSize: batch.length,
        totalRows: rows.length,
        success: batch.length - failed.length,
        failed: failed.length,
        progress: `${((i + BATCH_SIZE) / rows.length * 100).toFixed(1)}%`
      });
      
      // Log memory usage for large imports
      if (rows.length > 1000) {
        const used = process.memoryUsage();
        this.logger.debug(`Memory usage after batch ${batchNumber}`, {
          importId,
          rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
          heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
          heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
          external: used.external ? `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB` : 'N/A'
        });
      }
      }
    } catch (error) {
      this.logger.error('Failed to save rows to Cosmos DB', {
        importId: rows[0]?._importId,
        error,
      });
      throw new Error(`Failed to save rows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get import metadata by ID
   */
  async getImport(importId: string): Promise<ImportMetadata | null> {
    try {
      const cosmosDb = await initializeCosmosDB();
      const query = 'SELECT * FROM c WHERE c.id = @id AND c._partitionKey = @partitionKey';
      const parameters = [
        { name: '@id', value: `import_${importId}` },
        { name: '@partitionKey', value: this.metadataPartitionKey }
      ];
      
      const result = await cosmosDb.query<ImportMetadata>(
        query,
        parameters,
        this.metadataContainerName
      );
      
      const metadata = result[0] || null;
      
      this.logger.debug('Retrieved import metadata', {
        importId,
        found: !!metadata,
        container: this.metadataContainerName,
        partitionKey: this.metadataPartitionKey
      });
      
      return metadata;
    } catch (error: unknown) {
      const typedError = error as { code?: number };
      if (typedError.code === 404) {
        return null;
      }
      this.logger.error('Failed to get import metadata', { importId, error });
      throw error;
    }
  }

  /**
   * List all imports with pagination
   */
  async listImports({
    limit = 50,
    offset = 0,
    status,
  }: {
    limit?: number;
    offset?: number;
    status?: ImportMetadata['status'];
  } = {}): Promise<{ items: ImportMetadata[]; total: number }> {
    try {
      const cosmosDb = await initializeCosmosDB();
      const queryParts = ['SELECT * FROM c WHERE c._partitionKey = @partitionKey'];
      const parameters: { name: string; value: unknown }[] = [
        { name: '@partitionKey', value: this.metadataPartitionKey },
      ];

      if (status) {
        queryParts.push('AND c.status = @status');
        parameters.push({ name: '@status', value: status });
      }

      // Build base query
      const baseQuery = queryParts.join(' ');
      
      // Get total count using a subquery to ensure valid CosmosRecord type
      const countQuery = `SELECT VALUE { id: 'count', count: COUNT(1) } FROM (${baseQuery})`;
      const countResult = await cosmosDb.query<{ id: string; count: number }>(
        countQuery, 
        parameters,
        this.metadataContainerName
      );
      
      const total = countResult[0]?.count || 0;
      
      // Get paginated results
      const paginatedQuery = `${baseQuery} ORDER BY c.processedAt DESC OFFSET @offset LIMIT @limit`;
      const paginatedParams = [
        ...parameters,
        { name: '@offset', value: offset },
        { name: '@limit', value: limit }
      ];
      
      const items = await cosmosDb.query<ImportMetadata>(
        paginatedQuery, 
        paginatedParams,
        this.metadataContainerName
      );
      
      this.logger.debug('Listed imports', {
        count: items.length,
        total,
        limit,
        offset,
        status,
        container: this.metadataContainerName,
        partitionKey: this.metadataPartitionKey
      });
      
      return { items, total };
    } catch (error) {
      this.logger.error('Failed to list imports', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        container: this.metadataContainerName,
        partitionKey: this.metadataPartitionKey
      });
      throw new Error(`Failed to list imports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const ingestionService = new IngestionService();

export default ingestionService;
