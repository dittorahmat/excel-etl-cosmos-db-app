import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import { fileParserService } from '../file-parser/file-parser.service.js';
import { initializeCosmosDB } from '../cosmos-db/cosmos-db.service.js';
import type { AzureCosmosDB } from '../../types/azure.js';
import { uploadToBlobStorage } from '../blob-storage/upload-to-blob-storage.js';
import type { CosmosRecord } from '../../types/azure.js';
import fs from 'fs/promises';
import { cosmosDbWrapper } from './cosmos-db-wrapper.js';
import { INGESTION_CONSTANTS } from './constants.js';

/**
 * Field type definition for schema detection
 */
export interface FieldTypeInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

/**
 * Detects the data type of each field in the parsed rows
 */
function detectFieldTypes(rows: Record<string, unknown>[], headers: string[]): FieldTypeInfo[] {
  if (rows.length === 0) {
    // If no rows, return all fields as string type
    return headers.map(header => ({ name: header, type: 'string' }));
  }

  const fieldTypes: Record<string, string> = {};

  for (const header of headers) {
    // Collect all values for this header across all rows (excluding undefined/null values)
    const values = rows.map(row => row[header]).filter(value => value !== undefined && value !== null);

    if (values.length === 0) {
      // If no values found for this field, default to string
      fieldTypes[header] = 'string';
      continue;
    }

    // Determine the most common type among the values
    const typeCounts: Record<string, number> = {};

    for (const value of values) {
      let type: string;

      // Determine type based on value
      if (typeof value === 'number') {
        // Check if it's an integer or a float by checking if it has decimal places
        type = Number.isInteger(value) ? 'number' : 'number'; // Both are treated as 'number' for consistency
      } else if (typeof value === 'string') {
        // Try to parse as number if it looks like one
        if (!isNaN(Number(value)) && !isNaN(parseFloat(value)) && value.trim() !== '') {
          // Check if it's an integer or float when parsed
          const numValue = Number(value);
          type = Number.isInteger(numValue) ? 'number' : 'number';
        } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          type = 'boolean';
        } else if (value.match(/^\d{4}-\d{2}-\d{2}$/) || value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          // Basic date format check (YYYY-MM-DD or ISO format)
          type = 'date';
        } else {
          type = 'string';
        }
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      } else if (Array.isArray(value)) {
        type = 'array';
      } else if (typeof value === 'object') {
        type = 'object';
      } else {
        type = 'string';
      }

      // Only add to typeCounts if the type is one of our expected types
      if (['string', 'number', 'boolean', 'date', 'array', 'object'].includes(type)) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    }

    // Find the most common type for this field
    let dominantType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' = 'string';
    let maxCount = 0;

    // Object.entries loses type information, so we need to verify the types
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        // Prioritize 'number' over 'string' if counts are equal
        if (count > maxCount || (count === maxCount && type === 'number' && dominantType === 'string')) {
          if (['string', 'number', 'boolean', 'date', 'array', 'object'].includes(type)) {
            maxCount = count;
            dominantType = type as 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
          }
        }
      }
    }

    fieldTypes[header] = dominantType;
  }

  return headers.map(header => {
    const type = fieldTypes[header] || 'string';
    return {
      name: header,
      type: type as 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
    };
  });
}

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
  fieldTypes?: FieldTypeInfo[]; // Added field types for schema detection
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
  private readonly metadataContainerName = INGESTION_CONSTANTS.METADATA_CONTAINER_NAME;
  private readonly dataContainerName = INGESTION_CONSTANTS.DATA_CONTAINER_NAME;
  private readonly metadataPartitionKey = INGESTION_CONSTANTS.METADATA_PARTITION_KEY;

  /**
   * Start the file import process
   */
  async startImport(
    filePath: string,
    fileName: string,
    fileType: string,
    userId: string,
    userName?: string,
    userEmail?: string
  ): Promise<ImportMetadata> {
    const importId = `import_${uuidv4()}`;
    const importStartTime = new Date();
    
    this.logger.info('Starting file import', {
      importId,
      fileName,
      fileType,
      filePath,
      userId,
      userName: userName || 'Unknown User',
      userEmail: userEmail || 'unknown@example.com',
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
      processedByName: userName || 'Unknown User',
      processedByEmail: userEmail || 'unknown@example.com',
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

    // Don't wait for the import to finish
    this.processImport(
      importId,
      filePath,
      fileName,
      fileType,
      userId,
      userName,
      userEmail,
      fileBuffer,
      importMetadata,
      cosmosDb
    ).catch(error => {
      this.logger.error('Error in background import process', { 
        importId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    });

    return importMetadata;
  }

  /**
   * Process the import asynchronously
   */
  async processImport(
    importId: string,
    filePath: string,
    fileName: string,
    fileType: string,
    userId: string,
    userName: string | undefined,
    userEmail: string | undefined,
    fileBuffer: Buffer,
    importMetadata: ImportMetadata,
    cosmosDb: AzureCosmosDB
  ): Promise<void> {
    try {
      // Upload the original file to blob storage
      this.logger.info('Uploading file to blob storage', { 
        importId,
        fileName, 
        fileType, 
        fileSize: fileBuffer.length 
      });
      
      let blobUrl = '';
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
          // Process all values in the row to replace new line characters with spaces
          const processedRow: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'string') {
              // Replace all new line characters (\r\n, \r, \n) with spaces
              processedRow[key] = value.replace(/[\r\n]+/g, ' ').trim();
            } else {
              processedRow[key] = value;
            }
          }
          
          // Add system fields to each row
          return {
            ...processedRow,
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

      // Detect field types from the parsed data
      const fieldTypes = detectFieldTypes(parseResult.rows, parseResult.headers);

      // Update metadata with parse results
      importMetadata.headers = parseResult.headers;
      importMetadata.fieldTypes = fieldTypes;
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
    } finally {
      // Always delete the temporary file
      await fs.unlink(filePath).catch(err => this.logger.error('Failed to delete temp file in finally', { filePath, error: err }));
    }
  }

  /**
   * Save import metadata to Cosmos DB
   */
  private async saveImportMetadata(metadata: ImportMetadata, cosmosDb: AzureCosmosDB): Promise<void> {
    const record = {
      ...metadata,
      id: `import_${metadata.id}`, // Prefix to distinguish from row documents
      _partitionKey: this.metadataPartitionKey, // Use fixed partition key for metadata
      documentType: INGESTION_CONSTANTS.DOCUMENT_TYPES.IMPORT, // Add document type for filtering
      _importId: metadata.id, // Add _importId for consistency with row documents
    };

    await cosmosDbWrapper.upsertRecordWithLogging(
      cosmosDb,
      record,
      this.metadataContainerName,
      'save import metadata',
      this.logger
    );
  }

  /**
   * Save rows to Cosmos DB in batches with improved error handling and retry logic
   */
  private async saveRows(rows: RowData[], cosmosDb: AzureCosmosDB): Promise<void> {
    if (rows.length === 0) {
      this.logger.debug('No rows to save');
      return;
    }

    const BATCH_SIZE = INGESTION_CONSTANTS.BATCH_SIZE; // 50 - optimized for 1000 RU/s
    const DELAY_BETWEEN_BATCHES = INGESTION_CONSTANTS.DELAY_BETWEEN_BATCHES; // 150ms - rate limiting
    const MAX_RETRIES = INGESTION_CONSTANTS.MAX_RETRIES;
    const BASE_RETRY_DELAY = INGESTION_CONSTANTS.BASE_RETRY_DELAY; // 500ms - less aggressive backoff
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
      estimatedTime: `${Math.round(rows.length / BATCH_SIZE * DELAY_BETWEEN_BATCHES / 1000)} seconds`
    });

    let totalSuccess = 0;
    let totalFailed = 0;
    let throttleCount = 0;

    try {
      // Process rows in batches WITH DELAY for rate limiting
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

        const startTime = Date.now();

        this.logger.info(`Processing batch ${batchNumber}/${totalBatches}`, {
          importId,
          batchSize: batch.length,
          progress: `${Math.min(100, ((i + BATCH_SIZE) / rows.length * 100)).toFixed(1)}%`,
          rowsProcessed: i + batch.length,
          totalRows: rows.length
        });

        // Process batch with retry logic
        const batchResults = await this.executeBatchWithRetry(
          batch,
          cosmosDb,
          MAX_RETRIES,
          BASE_RETRY_DELAY,
          importId
        );

        const batchSuccess = batchResults.filter(r => r.success).length;
        const batchFailed = batchResults.filter(r => !r.success).length;
        const batchThrottled = batchResults.filter(r => r.throttled).length;

        throttleCount += batchThrottled;
        totalSuccess += batchSuccess;
        totalFailed += batchFailed;

        const duration = Date.now() - startTime;

        this.logger.info(`Completed batch ${batchNumber}/${totalBatches}`, {
          importId,
          batchNumber,
          totalBatches,
          success: batchSuccess,
          failed: batchFailed,
          throttled: batchThrottled,
          duration: `${duration}ms`,
          totalSuccess,
          totalFailed,
          progress: `${Math.min(100, ((i + BATCH_SIZE) / rows.length * 100)).toFixed(1)}%`
        });

        // Add delay between batches (except for last batch)
        if (i + BATCH_SIZE < rows.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }

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

      // Log final results
      this.logger.info(`Finished saving rows for import ${importId}`, {
        importId,
        totalRows: rows.length,
        totalSuccess,
        totalFailed,
        throttleCount,
        successRate: `${((totalSuccess / rows.length) * 100).toFixed(2)}%`
      });

      // If we have too many failures, throw an error
      if (totalFailed > rows.length * 0.5) {
        const error = new Error(`Critical failure: ${totalFailed} out of ${rows.length} rows failed to save (${((totalFailed / rows.length) * 100).toFixed(2)}% failure rate)`);
        this.logger.error('High failure rate detected, aborting import', {
          importId,
          totalRows: rows.length,
          totalFailed,
          failureRate: ((totalFailed / rows.length) * 100).toFixed(2) + '%',
          error: error.message
        });
        throw error;
      } else if (totalFailed > 0) {
        // Log warnings for individual failures but continue
        this.logger.warn(`${totalFailed} rows failed to save but continuing with import`, {
          importId,
          totalRows: rows.length,
          totalFailed,
          failureRate: ((totalFailed / rows.length) * 100).toFixed(2) + '%'
        });
      }
    } catch (error) {
      this.logger.error('Failed to save rows to Cosmos DB', {
        importId: rows[0]?._importId,
        error: error instanceof Error ? error.message : 'Unknown error',
        totalRows: rows.length,
        totalSuccess,
        totalFailed,
        throttleCount
      });

      // Re-throw the error to be handled by the caller
      throw new Error(`Failed to save rows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a batch of row upserts with retry logic and throttling detection
   */
  private async executeBatchWithRetry(
    batch: RowData[],
    cosmosDb: AzureCosmosDB,
    maxRetries: number,
    baseDelay: number,
    importId: string
  ): Promise<Array<{
    success: boolean;
    throttled: boolean;
    row: RowData;
    error?: string;
    result?: unknown;
  }>> {
    return await Promise.all(
      batch.map(async (row) => {
        let wasThrottled = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const record = {
              ...row,
              id: `row_${row._importId}_${row._rowNumber}`,
              _partitionKey: `import_${row._importId}`,
              _rowId: row._rowNumber,
              documentType: INGESTION_CONSTANTS.DOCUMENT_TYPES.ROW,
            };

            const result = await cosmosDbWrapper.upsertRecordWithLogging(
              cosmosDb,
              record,
              this.dataContainerName,
              `upsert row ${row._rowNumber} for import ${importId}`,
              this.logger
            );

            return {
              success: true,
              throttled: false,
              row,
              result
            };
          } catch (error) {
            const isThrottled = (error as { code?: number })?.code === 429;

            if (isThrottled) {
              wasThrottled = true;
              this.logger.warn(`Throttling detected on row ${row._rowNumber} (attempt ${attempt})`, {
                importId,
                rowNumber: row._rowNumber,
                attempt,
                maxRetries
              });
            } else {
              this.logger.warn(`Failed to upsert row ${row._rowNumber} (attempt ${attempt})`, {
                importId,
                rowNumber: row._rowNumber,
                attempt,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }

            // If this is the last attempt, return failure
            if (attempt === maxRetries) {
              return {
                success: false,
                throttled: wasThrottled,
                row,
                error: error instanceof Error ? error.message : 'Unknown error'
              };
            }

            // Exponential backoff (less aggressive: 500ms, 1s, 2s)
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        return { success: false, throttled: wasThrottled, row, error: 'Max retries exceeded' };
      })
    );
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

  /**
   * Delete an import and all associated row data
   */
  async deleteImport(importId: string): Promise<{ deletedRows: number }> {
    try {
      const cosmosDb = await initializeCosmosDB();
      
      // Normalize the import ID - ensure it has the import_ prefix if not already present
      // The ID in the database should have the "import_" prefix
      const fullImportId = importId.startsWith('import_') ? importId : `import_${importId}`;
      
      this.logger.info(`Starting delete import process for ID: ${fullImportId}`, {
        importId: fullImportId,
        originalImportId: importId
      });

      // Check if the import exists
      const importQuery = 'SELECT * FROM c WHERE c.id = @id AND c._partitionKey = @partitionKey AND c.documentType = @documentType';
      const importParams = [
        { name: '@id', value: fullImportId },
        { name: '@partitionKey', value: 'imports' }, // This is the _partitionKey field value
        { name: '@documentType', value: INGESTION_CONSTANTS.DOCUMENT_TYPES.IMPORT }
      ];
      
      this.logger.info(`Querying for import metadata with ID: ${fullImportId}`, {
        importId: fullImportId,
        query: importQuery,
        params: importParams
      });
      
      const importResult = await cosmosDb.query<ImportMetadata>(
        importQuery,
        importParams,
        this.metadataContainerName
      );
      
      this.logger.info(`Import metadata query result: ${importResult.length} records found`, {
        importId: fullImportId,
        resultCount: importResult.length
      });
      
      if (importResult.length === 0) {
        this.logger.warn(`Import with ID ${fullImportId} not found for deletion`, { importId: fullImportId });
        throw new Error('Import not found');
      }
      
      // Extract file information
      const fileName = importResult[0]?.fileName || 'Unknown';
      const totalRows = importResult[0]?.totalRows || 0;
      
      this.logger.info(`Found import to delete - File: ${fileName}, Expected rows: ${totalRows}`, { 
        importId: fullImportId,
        fileName,
        totalRows
      });

      // Delete import metadata
      try {
        // For Cosmos DB with partition key path '/id', the partition key value must be the same as the document ID
        const metadataPartitionKeyValue = fullImportId; // Use the document ID as partition key value
        
        this.logger.info(`Deleting import metadata for file: ${fileName}`, {
          importId: fullImportId,
          fileName: fileName,
          itemId: fullImportId,
          partitionKey: metadataPartitionKeyValue, // Use document ID as partition key value
          containerName: this.metadataContainerName
        });
        
        await cosmosDbWrapper.deleteRecordWithLogging(
          cosmosDb,
          fullImportId,
          metadataPartitionKeyValue, // Use document ID as partition key value
          this.metadataContainerName,
          'delete import metadata',
          this.logger
        );
        this.logger.info(`Successfully deleted import metadata for file: ${fileName}`, { importId: fullImportId, fileName });
      } catch (deleteError) {
        this.logger.error(`Failed to delete import metadata for file: ${fileName}`, {
          importId: fullImportId,
          fileName: fileName,
          error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
          stack: deleteError instanceof Error ? deleteError.stack : undefined
        });
        throw new Error(`Failed to delete import metadata: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
      }

      // Delete any content documents that might exist with the import ID as partition key
      try {
        // Query using _partitionKey field (for documents that may have been stored with this field)
        const contentQuery = 'SELECT c.id FROM c WHERE c._partitionKey = @partitionKey AND NOT IS_DEFINED(c.documentType)';
        const contentParams = [
          { name: '@partitionKey', value: fullImportId }
        ];
        
        this.logger.info(`Querying for content documents associated with import: ${fullImportId}`, {
          importId: fullImportId,
          fileName: fileName,
          query: contentQuery,
          params: contentParams
        });
        
        const contentResults = await cosmosDb.query<{ id: string }>(
          contentQuery,
          contentParams,
          this.dataContainerName
        );
        
        this.logger.info(`Found ${contentResults.length} content documents for file: ${fileName}`, {
          importId: fullImportId,
          fileName: fileName,
          contentCount: contentResults.length
        });
        
        // Delete each content document
        for (const content of contentResults) {
          try {
            // For Cosmos DB with partition key path '/id', use the document's ID as the partition key value
            const contentPartitionKeyValue = content.id;
            
            this.logger.debug(`Deleting content document for file: ${fileName}`, {
              importId: fullImportId,
              fileName: fileName,
              contentId: content.id,
              partitionKey: contentPartitionKeyValue,
              containerName: this.dataContainerName
            });
            
            await cosmosDbWrapper.deleteRecordWithLogging(
              cosmosDb,
              content.id,
              contentPartitionKeyValue, // Use document ID as partition key value
              this.dataContainerName,
              `delete content ${content.id} for import ${fullImportId}`,
              this.logger
            );
          } catch (deleteError) {
            this.logger.warn(`Failed to delete content document for file: ${fileName}`, {
              importId: fullImportId,
              fileName: fileName,
              contentId: content.id,
              error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
              stack: deleteError instanceof Error ? deleteError.stack : undefined
            });
            // Continue with other content documents even if one fails
          }
        }
        
        this.logger.info(`Completed content deletion for file: ${fileName} - ${contentResults.length} documents processed`, {
          importId: fullImportId,
          fileName: fileName,
          contentCount: contentResults.length
        });
      } catch (contentError) {
        this.logger.warn(`Error occurred while deleting content documents for file: ${fileName}`, {
          importId: fullImportId,
          fileName: fileName,
          error: contentError instanceof Error ? contentError.message : 'Unknown error',
          stack: contentError instanceof Error ? contentError.stack : undefined
        });
        // Continue with row deletion even if content deletion fails
      }

      // Delete all row data for this import
      let deletedRowCount = 0;
      
      this.logger.info(`Starting to delete row data for file: ${fileName}`, { 
        importId: fullImportId,
        fileName: fileName
      });
      
      // Query all rows for this import using _partitionKey field
      const rowQuery = 'SELECT c.id FROM c WHERE c._partitionKey = @partitionKey AND c.documentType = @documentType';
      const rowParams = [
        { name: '@partitionKey', value: fullImportId },
        { name: '@documentType', value: INGESTION_CONSTANTS.DOCUMENT_TYPES.ROW }
      ];
      
      this.logger.info(`Querying for rows to delete for file: ${fileName}`, {
        importId: fullImportId,
        fileName: fileName,
        query: rowQuery,
        params: rowParams
      });
      
      const rowResults = await cosmosDb.query<{ id: string }>(
        rowQuery,
        rowParams,
        this.dataContainerName
      );
      
      this.logger.info(`Found ${rowResults.length} rows to delete for file: ${fileName} (expected ${totalRows} rows)`, { 
        importId: fullImportId,
        fileName: fileName,
        rowCount: rowResults.length,
        expectedRowCount: totalRows
      });
      
      // Delete each row individually using the correct partition key (the row's ID since partition path is '/id')
      for (const row of rowResults) {
        try {
          // For Cosmos DB with partition key path '/id', use the document's ID as the partition key value
          const rowPartitionKeyValue = row.id;
          
          this.logger.debug(`Deleting row for file: ${fileName}`, {
            importId: fullImportId,
            fileName: fileName,
            rowId: row.id,
            partitionKey: rowPartitionKeyValue, // Use document ID as partition key value
            containerName: this.dataContainerName
          });
          
          await cosmosDbWrapper.deleteRecordWithLogging(
            cosmosDb,
            row.id,
            rowPartitionKeyValue, // Use document ID as partition key value
            this.dataContainerName,
            `delete row ${row.id} for import ${fullImportId}`,
            this.logger
          );
          deletedRowCount++;
        } catch (deleteError) {
          this.logger.warn(`Failed to delete row for file: ${fileName}`, {
            importId: fullImportId,
            fileName: fileName,
            rowId: row.id,
            error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
            stack: deleteError instanceof Error ? deleteError.stack : undefined
          });
          // Continue with other rows even if one fails
        }
      }
      
      this.logger.info(`Successfully deleted file: ${fileName} - ${deletedRowCount} rows deleted`, { 
        importId: fullImportId,
        fileName: fileName,
        attempted: rowResults.length,
        deleted: deletedRowCount,
        totalRows: totalRows
      });

      return { deletedRows: deletedRowCount };
    } catch (error) {
      this.logger.error(`Failed to delete import for file associated with ID ${importId}`, {
        importId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to delete import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const ingestionService = new IngestionService();

export default ingestionService;
