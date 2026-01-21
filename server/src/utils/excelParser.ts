import { v4 as uuidv4 } from 'uuid';
import ExcelJS from 'exceljs';

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
      workbook = new ExcelJS.Workbook();
      // Using type assertion to any due to type incompatibility between Buffer types
      // ExcelJS expects Buffer but receives Buffer<ArrayBufferLike> from file processing pipeline
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(fileBuffer as any);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      return {
        success: false,
        count: 0,
        error: 'Invalid Excel file format'
      };
    }

    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return {
        success: false,
        count: 0,
        error: 'No worksheets found in the Excel file'
      };
    }

    // Extract headers from first row
    const firstRow = worksheet.getRow(1);
    const headers: string[] = [];
    firstRow.eachCell((cell) => {
      headers.push(String(cell.value || ''));
    });

    if (headers.length === 0) {
      return {
        success: false,
        count: 0,
        error: 'No headers found in the Excel file'
      };
    }

    // Process data rows (skip header row)
    const processedData: Record<string, unknown>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      // Skip header row
      if (rowNumber === 1) return;

      const record: Record<string, unknown> = {
        id: uuidv4(),
        _partitionKey: userId,
        fileName,
        containerName,
        rowNumber,
        uploadDate: new Date().toISOString(),
        status: 'pending',
      };

      // Map each cell to its header
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1]; // colNumber is 1-indexed
        if (header) {
          record[header] = cell.value !== null && cell.value !== undefined ? cell.value : null;
        }
      });

      processedData.push(record);
    });

    return {
      success: true,
      count: processedData.length,
      data: processedData,
      headers,
      rowCount: processedData.length,
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