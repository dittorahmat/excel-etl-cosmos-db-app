import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

import { logger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';

// Import types and values needed for error handling
import { MulterError } from 'multer';

// Type imports
import type { UploadResponse } from '../types/models.js';
import type { FileTypeError } from '../types/custom.js';
import type { CosmosRecord } from '../types/azure.js';
import { initializeAzureServices } from '../config/azure-services.js';

const router = Router();

// Initialize multer with memory storage
const storage = multer.memoryStorage();

// File filter for multer
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile?: boolean) => void
) => {
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'text/csv',
    'application/csv',
    'text/x-csv',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error(
      'Invalid file type. Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.'
    ) as unknown as FileTypeError;
    error.name = 'FileTypeError';
    error.code = 'INVALID_FILE_TYPE';
    cb(error);
  }
};

// Create a logger instance for this module
const routeLogger = logger.child({ module: 'upload.route' });

// Configure multer upload
const MAX_FILE_SIZE_MB = 10;
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
    files: 1, // Limit to single file upload
  },
});

/**
 * Process Excel file and upload to Cosmos DB
 * @param fileBuffer - The file buffer containing Excel data
 * @param fileName - Original file name
 * @param containerName - Azure Blob Storage container name
 * @param userId - Azure AD user ID (oid) who uploaded the file
 * @returns Object containing processing results
 */
const processExcelFile = async (
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

// Helper function to create consistent error responses
const createErrorResponse = (status: number, error: string, message: string) => ({
  success: false,
  error,
  message,
  statusCode: status
});

// Define the route handler function
const uploadHandler = async (req: Request, res: Response<UploadResponse>) => {
  // Log the start of the upload handler
  console.log('[upload.route] Upload handler started');

  try {
    // Check if file exists in the request
    if (!req.file) {
      console.warn('[upload.route] No file uploaded');
      return res.status(400).json(
        createErrorResponse(400, 'No file uploaded', 'Please provide a file to upload')
      );
    }

    // Log file processing start with additional context
    console.log('[upload.route] Processing file:', {
      fileName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      bufferLength: req.file.buffer?.length || 0,
      fieldname: req.file.fieldname,
      encoding: req.file.encoding,
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
      userAgent: req.headers['user-agent']
    });

    // Get user ID from the authenticated request or use a default for unauthenticated uploads
    const authRequired = process.env.AUTH_ENABLED === 'true';
    const userId = req.user?.oid || 'anonymous';
    
    if (authRequired && !req.user?.oid) {
      console.warn('[upload.route] Authentication required but no user ID found in request');
      return res.status(401).json(
        createErrorResponse(401, 'Authentication required', 'User not authenticated')
      );
    }

    // Initialize Azure services
    const containerName = process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads';
    let blobStorage, cosmosDb;

    try {
      console.log('[upload.route] Initializing Azure services');
      const services = await initializeAzureServices();
      blobStorage = services.blobStorage;
      cosmosDb = services.cosmosDb;
    } catch (error) {
      console.error('[upload.route] Failed to initialize Azure services:', error);
      return res.status(500).json(
        createErrorResponse(500, 'Service initialization failed', 'Failed to initialize storage services')
      );
    }

    // Upload file to blob storage
    let uploadResult;
    try {
      console.log('[upload.route] Uploading file to blob storage');
      uploadResult = await blobStorage.uploadFile(containerName, req.file);
      console.log('[upload.route] File uploaded successfully:', uploadResult);
    } catch (error) {
      console.error('[upload.route] Error uploading to blob storage:', error);
      return res.status(500).json(
        createErrorResponse(500, 'Upload failed', 'Failed to upload file to storage')
      );
    }

    const blobUrl = uploadResult.url;

    // Process the uploaded file with user context
    try {
      console.log('[upload.route] Processing Excel file');
      const result = await processExcelFile(
        req.file.buffer,
        req.file.originalname,
        containerName,
        userId
      );

      if (!result.success) {
        console.error('[upload.route] Error processing file:', result.error);
        return res.status(400).json(
          createErrorResponse(400, 'File processing failed', result.error || 'Failed to process file')
        );
      }

      // Save metadata to Cosmos DB
      try {
        console.log('[upload.route] Preparing to save metadata to Cosmos DB');
        const record: CosmosRecord = {
          id: uuidv4(),
          userId,
          fileName: req.file.originalname,
          blobUrl: blobUrl,
          uploadDate: new Date().toISOString(),
          status: 'completed',
          documentType: 'excelRecord',
          rowCount: result.rowCount || 0,
          columnCount: result.columnCount || 0,
          headers: result.headers || [],
          _partitionKey: userId,
        };

        // Log the complete record before saving
        console.log('[upload.route] Record to be saved:', JSON.stringify({
          ...record,
          // Don't log potentially large arrays in production
          headers: process.env.NODE_ENV === 'development' ? record.headers : `[${record.headers?.length} headers]`,
          // Add any additional debug info
          containerName,
          userId,
          timestamp: new Date().toISOString()
        }, null, 2));

        console.log(`[upload.route] Attempting to save record to container: ${containerName}`);
        console.log(`[upload.route] Using partition key: ${record._partitionKey}`);
        
        // Save the record
        const savedRecord = await cosmosDb.upsertRecord(record, containerName);
        
        console.log('[upload.route] Metadata successfully saved to Cosmos DB:', {
          id: savedRecord?.id,
          etag: (savedRecord as any)?._etag,
          timestamp: new Date().toISOString()
        });
      } catch (dbError: any) {
        console.error('[upload.route] Error saving to Cosmos DB:', {
          message: dbError.message,
          code: dbError.code,
          statusCode: dbError.statusCode,
          details: dbError.details || 'No additional details',
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined,
          record: {
            id: record?.id,
            userId: record?.userId,
            fileName: record?.fileName,
            containerName,
            hasPartitionKey: !!record?._partitionKey,
            partitionKeyValue: record?._partitionKey
          }
        });
        // Continue even if DB save fails, as the file was already uploaded
      }

      // Return success response
      console.log('[upload.route] File processed successfully');
      return res.status(200).json({
        success: true,
        message: 'File processed successfully',
        data: {
          fileName: req.file.originalname,
          blobUrl: blobUrl,
          rowCount: result.rowCount || 0,
          columnCount: result.columnCount || 0,
          headers: result.headers || [],
        },
      });
    } catch (error: unknown) {
      console.error('[upload.route] Error in file processing:', error);

      // Handle multer errors
      if (error && typeof error === 'object' && 'code' in error) {
        const err = error as { code?: string; message?: string };
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json(
            createErrorResponse(413, 'File too large', `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB`)
          );
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json(
            createErrorResponse(400, 'Too many files', 'Only one file can be uploaded at a time')
          );
        }

        const errorMessage = err.message || 'Failed to upload file';
        return res.status(400).json(
          createErrorResponse(400, 'Upload error', errorMessage)
        );
      }
      
      // Handle file processing errors for unsupported formats
      if (error instanceof Error && error.message.includes('unsupported format')) {
        return res.status(400).json(
          createErrorResponse(400, 'Invalid file format', 'The file format is not supported')
        );
      }

      // Handle other types of errors
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('[upload.route] Error processing file:', error);
      return res.status(500).json(
        createErrorResponse(
          500,
          'Server error',
          process.env.NODE_ENV === 'development'
            ? errorMessage
            : 'An error occurred while processing the file'
        )
      );
    }
  } catch (error: unknown) {
    const errorId = uuidv4();
    const err = error as Error & { code?: string; statusCode?: number; name?: string };
    const errorMessage = err.message || 'Unknown error';
    const errorStack = err.stack || 'No stack trace';

    // Log the error with detailed context
    console.error(`[upload.route] Error [${errorId}]:`, {
      error: errorMessage,
      name: err.name,
      code: err.code,
      statusCode: err.statusCode,
      stack: errorStack,
      timestamp: new Date().toISOString()
    });

    // Return error response
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: `An unexpected error occurred (${errorId})`,
      ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
    });
  }
};

// Determine if authentication is required
const authRequired = process.env.AUTH_ENABLED === 'true';

// Define the upload route with conditional authentication
const uploadRoute = router.post(
  '/',
  // Only apply authentication if required
  ...(authRequired ? [authenticateToken] : []),
  upload.single('file'),
  (req, res, next) => {
    try {
      routeLogger.info('Upload route hit', {
        method: req.method,
        path: req.path,
        hasFile: !!req.file,
        user: req.user?.oid || 'unknown'
      });
      next();
    } catch (error) {
      routeLogger.error('Error in upload route middleware', { error });
      next(error);
    }
  },
  uploadHandler
);

// Error handling middleware
router.use((err: Error & { code?: string; statusCode?: number; name?: string }, req: Request, res: Response<UploadResponse>) => {
  routeLogger.error('Upload route error', {
    error: err.message || 'Unknown error',
    stack: err.stack,
    code: err.code,
    name: err.name,
    originalUrl: req.originalUrl,
    method: req.method,
    user: req.user?.oid || 'unknown'
  });

  if (err instanceof MulterError) {
    // Handle multer errors (file size, file count, etc.)
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`, // Add message property
      error: `File upload error: ${err.message}`,
      statusCode: 400
    });
  }

  if (err.name === 'FileTypeError' || err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Invalid file type', // Add message property
      error: err.message || 'Invalid file type',
      statusCode: 400
    });
  }

  // Default error handler
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred while processing your request', // Add message property
    error: 'An unexpected error occurred while processing your request',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    statusCode: 500
  });
});

export { uploadHandler, processExcelFile };
export default router;
