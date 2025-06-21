import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Express } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { initializeAzureServices } from '../config/azure-services.js';
import type { CosmosRecord } from '../types/index.js';
import type { ExcelRecord, UploadResponse } from '../types/models.js';
import { authenticateToken } from '../middleware/auth.js';
import type { MulterError as MulterErrorType, FileTypeError } from '../types/custom.js';

// Extend Express Request type to include our custom properties
// This is already declared in custom.d.ts, so no need to redeclare here.

const router = Router();

// Initialize multer with memory storage
const storage = multer.memoryStorage();

// File filter for multer
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: (error: any, acceptFile?: boolean) => void
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
    ) as FileTypeError;
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
  data?: any[];
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
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      header: 1,
      raw: true,
      defval: '',
      blankrows: false,
    });

    // Extract headers (first row)
    const headers = jsonData[0] as string[];
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
      const record: Record<string, any> = {
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
const uploadHandler = async (req: Request, res: Response<UploadResponse>, next: NextFunction) => {
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

    // Log file processing start
    console.log('[upload.route] Processing file:', {
      fileName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Get user ID from the authenticated request
    const userId = req.user?.oid;
    if (!userId) {
      console.warn('[upload.route] No user ID found in request');
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
        console.log('[upload.route] Saving metadata to Cosmos DB');
        const record: CosmosRecord = {
          id: uuidv4(),
          userId,
          fileName: req.file.originalname,
          blobUrl: blobUrl, // Use blobUrl instead of fileUrl
          uploadDate: new Date().toISOString(),
          status: 'completed',
          documentType: 'excelRecord',
          rowCount: result.rowCount || 0,
          columnCount: result.columnCount || 0,
          headers: result.headers || [],
          _partitionKey: userId,
        };

        await cosmosDb.upsertRecord(record, containerName);
        console.log('[upload.route] Metadata saved to Cosmos DB');
      } catch (dbError) {
        console.error('[upload.route] Error saving to Cosmos DB:', dbError);
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
    } catch (error) {
      console.error('[upload.route] Error in file processing:', error);

      // Handle specific error types
      if (error instanceof MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json(
            createErrorResponse(413, 'File too large', `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB`)
          );
        }

        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json(
            createErrorResponse(400, 'Too many files', 'Only one file can be uploaded at a time')
          );
        }

        return res.status(400).json(
          createErrorResponse(400, 'Upload error', error.message || 'Failed to upload file')
        );
      }

      // Handle file processing errors
      if (error instanceof Error && error.message.includes('unsupported format')) {
        return res.status(400).json(
          createErrorResponse(400, 'Invalid file format', 'The file format is not supported')
        );
      }

      // Handle other errors
      console.error('[upload.route] Unhandled error:', error);
      return res.status(500).json(
        createErrorResponse(
          500,
          'Internal server error',
          process.env.NODE_ENV === 'development'
            ? error instanceof Error ? error.message : 'Unknown error'
            : 'An unexpected error occurred'
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

// Define the upload route
router.post(
  '/',
  authenticateToken,
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
router.use((err: any, req: Request, res: Response<UploadResponse>, next: NextFunction) => {
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
