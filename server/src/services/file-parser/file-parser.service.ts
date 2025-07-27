import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { logger } from '../../utils/logger.js';
import csv from 'csv-parser';
import * as fs from 'fs';

interface ParseOptions {
  /**
   * Maximum number of rows to process (for testing or preview)
   * @default Infinity (process all rows)
   */
  maxRows?: number;
  
  /**
   * Whether to include empty rows in the output
   * @default false
   */
  includeEmptyRows?: boolean;
  
  /**
   * Optional function to transform each row
   * Return null to skip the row
   */
  transformRow?: (row: Record<string, unknown>, rowIndex: number) => Record<string, unknown> | null;
}

interface ParseResult {
  /** Array of parsed rows */
  rows: Record<string, unknown>[];
  
  /** Array of column headers found in the file */
  headers: string[];
  
  /** Total number of rows processed */
  totalRows: number;
  
  /** Number of rows successfully parsed */
  validRows: number;
  
  /** Any errors encountered during parsing */
  errors: Array<{
    row: number;
    error: string;
    rawData?: unknown;
  }>;
}

/**
 * Service for parsing Excel and CSV files with dynamic schemas
 */
export class FileParserService {
  private logger = logger.child({ module: 'file-parser' });

  /**
   * Parse an Excel file buffer
   */
  async parseExcel(
    filePath: string,
    options: ParseOptions = {}
  ): Promise<ParseResult> {
    const result: ParseResult = {
      rows: [],
      headers: [],
      totalRows: 0,
      validRows: 0,
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath, {
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('No worksheets found in the Excel file');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        header: 1, // Get raw data including headers
        raw: false, // Get formatted strings
        defval: null, // Use null for empty cells
        blankrows: false,
      });

      if (jsonData.length === 0) {
        return result;
      }

      // First row is headers - ensure it's treated as an array of unknown values
      const firstRow = Array.isArray(jsonData[0]) ? jsonData[0] : Object.values(jsonData[0] || {});
      const headers = firstRow.map((h, index) => 
        (h !== null && h !== undefined ? String(h).trim() : '') || `column_${index + 1}`
      ) as string[];

      result.headers = headers;
      result.totalRows = jsonData.length - 1; // Exclude header row

      // Process rows
      for (let i = 1; i < jsonData.length; i++) {
        if (options.maxRows && result.rows.length >= options.maxRows) {
          break;
        }

        // Ensure rowData is treated as an array of unknown values
        const currentRow = jsonData[i];
        const rowData = Array.isArray(currentRow) 
          ? currentRow 
          : Object.values(currentRow || {});
        const row: Record<string, unknown> = {};
        let isEmpty = true;

        try {
          // Map each cell to its header
          for (let j = 0; j < Math.min(headers.length, rowData.length); j++) {
            const header = headers[j];
            const value = rowData[j];
            if (value !== null && value !== undefined && value !== '') {
              row[header] = value;
              isEmpty = false;
            }
          }

          if (isEmpty && !options.includeEmptyRows) {
            continue;
          }

          // Apply custom transformation if provided
          const transformedRow = options.transformRow 
            ? options.transformRow(row, i)
            : row;

          if (transformedRow !== null) {
            result.rows.push(transformedRow);
            result.validRows++;
          }
        } catch (error) {
          result.errors.push({
            row: i,
            error: error instanceof Error ? error.message : 'Unknown error',
            rawData: rowData,
          });
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Error parsing Excel file:', { error });
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a CSV file using streaming for large files
   */
  async parseCsv(
    fileStream: Readable,
    options: ParseOptions = {}
  ): Promise<ParseResult> {
    const result: ParseResult = {
      rows: [],
      headers: [],
      totalRows: 0,
      validRows: 0,
      errors: [],
    };

    try {
      // Create transform stream for CSV processing
      const transform = new Transform({
        objectMode: true,
        transform: (chunk, encoding, callback) => {
          try {
            // Skip empty rows if configured to do so
            if (!options.includeEmptyRows && Object.values(chunk).every(v => v === null || v === undefined || v === '')) {
              return callback();
            }

            // Apply custom transformation if provided
            const transformedRow = options.transformRow 
              ? options.transformRow(chunk, result.totalRows)
              : chunk;

            if (transformedRow !== null) {
              result.rows.push(transformedRow);
              result.validRows++;
            }

            result.totalRows++;
            callback();
          } catch (error) {
            result.errors.push({
              row: result.totalRows,
              error: error instanceof Error ? error.message : 'Unknown error',
              rawData: chunk,
            });
            callback();
          }
        },
      });

      // Set up the pipeline
      await pipeline(
        fileStream,
        csv({
          mapHeaders: ({ header, index }: { header: string; index: number }) => {
            // Clean up header names
            const cleanHeader = header.trim() || `column_${index + 1}`;
            // Store headers on first pass
            if (result.headers.length <= index) {
              result.headers.push(cleanHeader);
            }
            return cleanHeader;
          },
          mapValues: ({ value }: { value: string }) => {
            // Convert empty strings to null for consistency
            return value === '' ? null : value;
          },
          skipLines: 0,
          strict: false,
        }),
        transform
      );

      return result;
    } catch (error) {
      this.logger.error('Error parsing CSV file:', { error });
      throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse a file based on its MIME type
   */
  async parseFile(
    filePath: string,
    mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParseResult> {
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return this.parseExcel(filePath, options);
    } else if (mimeType.includes('csv') || mimeType.includes('text/csv')) {
      const stream = fs.createReadStream(filePath); // Create read stream from file path
      return this.parseCsv(stream, options);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }
}

// Export a singleton instance
export const fileParserService = new FileParserService();

export default fileParserService;
