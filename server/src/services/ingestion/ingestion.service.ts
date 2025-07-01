import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import { fileParserService } from '../file-parser/file-parser.service.js';
import { getOrInitializeCosmosDB } from '../cosmos-db/cosmos-db.service.js';
import type { CosmosRecord } from '../../types/azure.js';


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
  [key: string]: unknown; // Allow dynamic properties
}

export class IngestionService {
  private logger = logger.child({ module: 'ingestion-service' });
  private readonly metadataContainerName = 'excel-records';
  private readonly dataContainerName = 'excel-records';

  /**
   * Process and import a file into Cosmos DB
   */
  async importFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    userId: string
  ): Promise<ImportMetadata> {
    const importId = `imp_${uuidv4()}`;
    const importStartTime = new Date();

    const importMetadata: ImportMetadata = {
      id: importId,
      fileName,
      fileType,
      fileSize: fileBuffer.length,
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

    try {
      // Save initial import metadata
      await this.saveImportMetadata(importMetadata);

      // Parse the file
      const parseResult = await fileParserService.parseFile(fileBuffer, fileType, {
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

      // Update metadata with parse results
      importMetadata.headers = parseResult.headers;
      importMetadata.totalRows = parseResult.totalRows;
      importMetadata.validRows = parseResult.validRows;
      importMetadata.errorRows = parseResult.errors.length;
      importMetadata.errors = parseResult.errors;

      if (parseResult.rows.length > 0) {
        // Save rows to Cosmos DB in batches
        await this.saveRows(parseResult.rows as RowData[]);
      }

      // Update import status to completed
      importMetadata.status = 'completed';
      await this.saveImportMetadata(importMetadata);

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

      await this.saveImportMetadata(importMetadata).catch((saveError) => {
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
  private async saveImportMetadata(metadata: ImportMetadata): Promise<void> {
    try {
      const cosmosDb = await getOrInitializeCosmosDB();
      const record = {
        ...metadata,
        id: `import_${metadata.id}`, // Prefix to distinguish from row documents
        _partitionKey: `import_${metadata.id}`, // Use import ID as partition key
      };
      
      this.logger.debug('Saving import metadata', { record });
      
      const result = await cosmosDb.upsertRecord<ImportMetadata>(record);
      
      this.logger.debug('Import metadata saved', { 
        importId: metadata.id,
        etag: result.etag,
        statusCode: result.statusCode 
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
  private async saveRows(rows: RowData[]): Promise<void> {
    if (rows.length === 0) return;

    const BATCH_SIZE = 100; // Cosmos DB batch limit
    const cosmosDb = await getOrInitializeCosmosDB();
    const importId = rows[0]?._importId;

    if (!importId) {
      throw new Error('No import ID found in row data');
    }

    this.logger.debug(`Saving ${rows.length} rows for import ${importId}`);

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
            };
            
            return cosmosDb.upsertRecord<RowData>(record);
          })
        );

        // Log any failed operations
        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        if (failed.length > 0) {
          this.logger.error(`Failed to save ${failed.length} rows in batch ${i / BATCH_SIZE + 1}`, {
            importId,
            errors: failed.map(f => f.reason)
          });
          throw new Error(`Failed to save ${failed.length} rows in batch ${i / BATCH_SIZE + 1}`);
        }

        this.logger.debug(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(rows.length / BATCH_SIZE)}`, {
          importId,
          batchStart: i + 1,
          batchEnd: Math.min(i + BATCH_SIZE, rows.length),
          totalRows: rows.length,
          success: batch.length - failed.length,
          failed: failed.length
        });
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
      const cosmosDb = await getOrInitializeCosmosDB();
      const container = await cosmosDb.container(this.metadataContainerName, '/_partitionKey');
      
      const { resource } = await container.item(`import_${importId}`, 'imports').read<ImportMetadata>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
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
      const cosmosDb = await getOrInitializeCosmosDB();
      const querySpec = {
        query: 'SELECT * FROM c WHERE c._partitionKey = @partitionKey',
        parameters: [
          { name: '@partitionKey', value: 'imports' }
        ]
      };

      if (status) {
        querySpec.query += ' AND c.status = @status';
        querySpec.parameters.push({ name: '@status', value: status });
      }

      querySpec.query += ' ORDER BY c.processedAt DESC OFFSET @offset LIMIT @limit';
      querySpec.parameters.push(
        { name: '@offset', value: offset.toString() },
        { name: '@limit', value: limit.toString() }
      );

      const metadataContainer = await cosmosDb.container(this.metadataContainerName, '/_partitionKey');
      const { resources: items } = await metadataContainer.items
        .query<ImportMetadata>(querySpec)
        .fetchAll();

      // Get total count
      const countQuery = {
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c._partitionKey = @partitionKey',
        parameters: [
          { name: '@partitionKey', value: 'imports' }
        ]
      };

      if (status) {
        countQuery.query += ' AND c.status = @status';
        countQuery.parameters.push({ name: '@status', value: status });
      }

      const countContainer = await cosmosDb.container(this.metadataContainerName, '/_partitionKey');
      const { resources: countResult } = await countContainer.items
        .query<number>(countQuery)
        .fetchAll();

      return {
        items,
        total: countResult[0] || 0,
      };
    } catch (error) {
      this.logger.error('Failed to list imports', { error });
      throw new Error(`Failed to list imports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const ingestionService = new IngestionService();

export default ingestionService;
