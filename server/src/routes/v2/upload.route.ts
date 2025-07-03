import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import { authenticateToken } from '../../middleware/auth.js';
import { ingestionService } from '../../services/ingestion/ingestion.service.js';


// Type imports
import type { FileTypeError } from '../../types/custom.js';

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

// Configure multer upload
const MAX_FILE_SIZE_MB = 100; // Increased from 10MB to 100MB for larger files
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
    files: 1, // Limit to single file upload
  },
});

// Helper function to create consistent error responses
const createErrorResponse = (status: number, error: string, message: string) => ({
  status,
  error,
  message,
});

/**
 * Upload and process a file
 */
async function uploadHandler(req: Request, res: Response) {
  const startTime = Date.now();
  const requestId = req.id || `req_${uuidv4()}`;
  const userId = req.user?.oid || 'anonymous';
  
  // Check if file exists
  if (!req.file) {
    return res.status(400).json(
      createErrorResponse(400, 'No file uploaded', 'Please upload a file')
    );
  }

  const { buffer, originalname: fileName, mimetype } = req.file;
  const fileType = mimetype;
  const fileSize = buffer.length;

  // Log the upload attempt
  logger.info('File upload started', {
    requestId,
    fileName,
    fileType,
    fileSize,
    userId,
  });

  try {
    // Process the file using the ingestion service
    const importMetadata = await ingestionService.importFile(
      buffer,
      fileName,
      fileType,
      userId
    );

    // Log successful import
    logger.info('File import completed', {
      requestId,
      importId: importMetadata.id,
      fileName,
      duration: Date.now() - startTime,
      rowsProcessed: importMetadata.totalRows,
      validRows: importMetadata.validRows,
      errorRows: importMetadata.errorRows,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'File processed successfully',
      importId: importMetadata.id,
      fileName,
      totalRows: importMetadata.totalRows,
      validRows: importMetadata.validRows,
      errorRows: importMetadata.errorRows,
      errors: importMetadata.errors,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the error
    logger.error('File import failed', {
      requestId,
      fileName,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime,
    });

    // Return error response
    return res.status(500).json(
      createErrorResponse(
        500,
        'File processing failed',
        `Failed to process file: ${errorMessage}`
      )
    );
  }
}

// Apply authentication middleware if enabled
const authRequired = process.env.AUTH_ENABLED === 'true';

// Define the upload route with conditional authentication
if (authRequired) {
  router.post(
    '/',
    authenticateToken,
    upload.single('file'),
    uploadHandler
  );
} else {
  // In development, allow uploads without authentication
  router.post(
    '/',
    upload.single('file'),
    uploadHandler
  );
}

// Add a health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', version: 'v2' });
});

// Error handling middleware
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json(
        createErrorResponse(
          413,
          'File too large',
          `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB`
        )
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json(
        createErrorResponse(400, 'Too many files', 'Only one file can be uploaded at a time')
      );
    }
  }

  // Handle file type errors
  const typedError = err as Error & { code?: string };
  if (typedError.name === 'FileTypeError' || typedError.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json(
      createErrorResponse(
        400,
        'Invalid file type',
        err.message || 'Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.'
      )
    );
  }

  // Handle other errors
  logger.error('Upload route error', { error: err });
  return res.status(500).json(
    createErrorResponse(
      500,
      'Internal server error',
      'An error occurred while processing your request'
    )
  );
});

export { router as uploadRouterV2 };
