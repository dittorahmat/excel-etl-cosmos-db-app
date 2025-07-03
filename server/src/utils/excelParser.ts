import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

/**
 * Process Excel file and upload to Cosmos DB
 * @param fileBuffer - The file buffer containing Excel data
 * @param fileName - Original file name
 * @param containerName - Azure Blob Storage container name
 * @param userId - Azure AD user ID (oid) who uploaded the file
 * @returns Object containing processing results
 */
export const processExcelFile = async (
  fileBuffer: Buffer,
  fileName: string,
  containerName: string,
  userId: string
): Promise<{
  success: boolean;
  count: number;
  error?: string;
  data?: Record<string, unknown>[];
  headers?: string[];
  rowCount?: number;
  columnCount?: number;
}> => {
  try {
    // Parse the Excel file with error handling for invalid formats
    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, {
        type: 'buffer',
        cellDates: true, // Parse dates properly
        dateNF: 'yyyy-mm-dd', // Format dates consistently
      });
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      return {
        success: false,
        count: 0,
        error: 'Invalid Excel file format'
      };
    }

    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        count: 0,
        error: 'No worksheets found in the Excel file'
      };
    }

    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    });

    // Extract headers (first row)
    const headers = jsonData[0] as unknown as string[];
    const dataRows = jsonData.slice(1);

    if (dataRows.length === 0) {
      return {
        success: false,
        count: 0,
        error: 'No data rows found in the Excel file'
      };
    }

    // Process data rows
    const processedData = dataRows.map((row, index) => {
      const record: Record<string, unknown> = {
        id: uuidv4(),
        _partitionKey: userId,
        fileName,
        containerName,
        rowNumber: index + 2, // +2 because of 1-based index and header row
        uploadDate: new Date().toISOString(),
        status: 'pending',
      };

      // Map each cell to its header
      headers.forEach((header, colIndex) => {
        if (header) {
          record[header] = row[colIndex] !== undefined ? row[colIndex] : null;
        }
      });

      return record;
    });

    return {
      success: true,
      count: processedData.length,
      data: processedData,
      headers,
      rowCount: dataRows.length,
      columnCount: headers.length,
    };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to process Excel file'
    };
  }
};