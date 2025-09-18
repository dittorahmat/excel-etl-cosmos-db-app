import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { logger } from '../../utils/logger.js';
import csv from 'csv-parser';
import * as fs from 'fs';
import { detectCsvDelimiter } from '../../utils/csv-delimiter-detector.js';

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
   * Process a cell value to ensure proper type handling
   * @param value The raw cell value
   * @returns The processed value with proper types
   */
  private processCellValue(value: unknown): unknown {
    // For Excel, numbers might come through as Number objects
    if (typeof value === 'number') {
      return value;
    }
    
    // For Excel, dates might come through as Date objects
    if (value instanceof Date) {
      return value;
    }
    
    // For strings that might be numbers or dates
    if (typeof value === 'string') {
      // Try to parse as number first
      if (this.isNumericString(value)) {
        return this.parseNumericString(value);
      }
      
      // Try to parse as date
      if (this.isDateString(value)) {
        return this.parseDateString(value);
      }
      
      return value;
    }
    
    return value;
  }

  /**
   * Check if a string matches the dd-mm-yyyy date format
   * @param value The string to check
   * @returns True if the string matches the date format
   */
  private isDateString(value: string): boolean {
    // Regular expression for dd-mm-yyyy format
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    return dateRegex.test(value);
  }

  /**
   * Parse a date string in dd-mm-yyyy format
   * @param dateString The date string to parse
   * @returns A Date object or the original string if parsing fails
   */
  private parseDateString(dateString: string): Date | string {
    try {
      const parts = dateString.split('-');
      if (parts.length !== 3) {
        return dateString;
      }
      
      // Check that all parts exist
      if (parts[0] === undefined || parts[1] === undefined || parts[2] === undefined) {
        return dateString;
      }
      
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      // Check if all parts are valid numbers
      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return dateString;
      }
      
      // Create date (month is 0-indexed in JavaScript)
      const date = new Date(year, month - 1, day);
      
      // Validate that the date is valid
      if (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      ) {
        return date;
      }
      
      // Return original string if date is invalid
      return dateString;
    } catch (error) {
      // Return original string if parsing fails
      return dateString;
    }
  }

  /**
   * Check if a string represents a numeric value
   * @param value The string to check
   * @returns True if the string represents a valid number
   */
  private isNumericString(value: string): boolean {
    // Regular expression for numeric values (integer or float with dot as decimal separator)
    const numericRegex = /^-?\d+(\.\d+)?$/;
    return numericRegex.test(value);
  }

  /**
   * Parse a numeric string
   * @param numericString The numeric string to parse
   * @returns A Number object or the original string if parsing fails
   */
  private parseNumericString(numericString: string): number | string {
    try {
      const num = parseFloat(numericString);
      
      // Check if the parsed number is valid and matches the original string
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
      
      // Return original string if number is invalid
      return numericString;
    } catch (error) {
      // Return original string if parsing fails
      return numericString;
    }
  }

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

    this.logger.debug('Starting Excel file parsing', { filePath });

    try {
      // Debug: Check if file exists and get file stats
      try {
        const stats = await fs.promises.stat(filePath);
        this.logger.debug('File stats:', {
          size: stats.size,
          modified: stats.mtime,
          mode: stats.mode.toString(8)
        });
      } catch (statsError) {
        this.logger.error('Error getting file stats:', statsError);
        throw new Error(`File not found or inaccessible: ${filePath}`);
      }
      // Read the file as buffer first for debugging
      let fileBuffer: Buffer;
      try {
        fileBuffer = await fs.promises.readFile(filePath);
        this.logger.debug('File read successfully', {
          bufferLength: fileBuffer.length,
          first100Bytes: fileBuffer.subarray(0, 100).toString('hex')
        });
      } catch (readError) {
        this.logger.error('Error reading file:', readError);
        throw new Error(`Failed to read file: ${filePath}`);
      }

      // Parse the Excel file
      let workbook;
      try {
        this.logger.debug('Attempting to parse Excel file...');
        workbook = XLSX.read(fileBuffer, {
          type: 'buffer',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        this.logger.debug('Successfully parsed Excel workbook', {
          sheetCount: workbook.SheetNames?.length || 0,
          sheetNames: workbook.SheetNames || []
        });
      } catch (error) {
        const parseError = error as Error;
        this.logger.error('Error parsing Excel file:', {
          error: parseError,
          errorMessage: parseError.message,
          errorStack: parseError.stack
        });
        throw new Error(`Failed to parse Excel file: ${parseError.message}`);
      }

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        const errorMsg = 'No worksheets found in the Excel file';
        this.logger.error(errorMsg, { sheetNames: workbook.SheetNames });
        throw new Error(errorMsg);
      }

      this.logger.debug('Processing worksheet:', { worksheetName: firstSheetName });
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        const errorMsg = `Worksheet '${firstSheetName}' not found in workbook`;
        this.logger.error(errorMsg, { sheetNames: workbook.SheetNames });
        throw new Error(errorMsg);
      }
      
      // Convert to JSON with header row
      // Convert worksheet to JSON
      let jsonData;
      try {
        this.logger.debug('Converting worksheet to JSON...');
        jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          header: 1, // Get raw data including headers
          raw: true, // Changed from false to true to preserve data types
          defval: null, // Use null for empty cells
          blankrows: false,
        });
        this.logger.debug('Successfully converted worksheet to JSON', {
          rowCount: jsonData.length,
          firstRow: jsonData[0] ? Object.keys(jsonData[0]) : []
        });
      } catch (error) {
        const conversionError = error as Error;
        this.logger.error('Error converting worksheet to JSON:', {
          error: conversionError,
          errorMessage: conversionError.message,
          errorStack: conversionError.stack
        });
        throw new Error(`Failed to convert worksheet to JSON: ${conversionError.message}`);
      }

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
            if (header && value !== null && value !== undefined && value !== '') {
              row[header] = this.processCellValue(value);
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
    options: ParseOptions = {},
    delimiter: string = ','
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

      // Set up the pipeline with the detected delimiter
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
            if (value === '') {
              return null;
            }
            
            // Try to parse as number first
            if (this.isNumericString(value)) {
              return this.parseNumericString(value);
            }
            
            // Try to parse as date if it matches our format
            if (this.isDateString(value)) {
              return this.parseDateString(value);
            }
            
            return value;
          },
          skipLines: 0,
          strict: false,
          separator: delimiter, // Use the detected delimiter
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
   * Parse a file based on its MIME type or file extension
   */
  async parseFile(
    filePath: string,
    mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParseResult> {
    const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
    
    // Log the MIME type and file extension for debugging
    this.logger.debug('Parsing file', { filePath, mimeType, fileExtension });

    // Check for Excel files by MIME type or extension
    const isExcelByMime = mimeType.includes('excel') || 
                         mimeType.includes('spreadsheet') ||
                         mimeType === 'application/octet-stream';
    
    const isExcelByExtension = ['xlsx', 'xls', 'xlsm'].includes(fileExtension);

    // Check for CSV files by MIME type or extension
    const isCsvByMime = mimeType.includes('csv') || 
                       mimeType.includes('text/csv') ||
                       mimeType === 'text/plain';
    
    const isCsvByExtension = fileExtension === 'csv';

    // Try to parse based on MIME type first, then fall back to file extension
    if (isExcelByMime || isExcelByExtension) {
      try {
        return await this.parseExcel(filePath, options);
      } catch (error) {
        this.logger.warn('Failed to parse as Excel, trying CSV as fallback', { 
          filePath, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        if (isCsvByMime || isCsvByExtension) {
          // Detect delimiter for CSV files
          const delimiter = await detectCsvDelimiter(filePath);
          const stream = fs.createReadStream(filePath);
          return this.parseCsv(stream, options, delimiter);
        }
        throw error;
      }
    } 
    
    if (isCsvByMime || isCsvByExtension) {
      // Detect delimiter for CSV files
      const delimiter = await detectCsvDelimiter(filePath);
      const stream = fs.createReadStream(filePath);
      return this.parseCsv(stream, options, delimiter);
    }

    throw new Error(`Unsupported file type: ${mimeType} (extension: .${fileExtension})`);
  }
}

// Export a singleton instance
export const fileParserService = new FileParserService();

export default fileParserService;
