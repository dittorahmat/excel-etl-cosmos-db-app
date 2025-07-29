import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

const router = Router();

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import * as authMiddleware from '../../middleware/auth.js';
import { ingestionService } from '../../services/ingestion/ingestion.service.js';
import path from 'path';
import fs from 'fs/promises';

// Type imports
import type { FileTypeError } from '../../types/custom.js';

const uploadDir = path.join(process.cwd(), 'tmp_uploads');

// Ensure the upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Initialize multer with disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for multer
export const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile?: boolean) => void
) => {
  // Log the incoming file details for debugging
  console.log('=== File Upload Debug ===');
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  
  // Extract file extension from original name
  const fileExt = file.originalname.split('.').pop()?.toLowerCase() || '';
  
  // Enhanced MIME type detection for common file types
  let detectedMimeType = file.mimetype;
  
  // If MIME type is application/octet-stream, try to detect based on file extension
  if (file.mimetype === 'application/octet-stream') {
    const extensionToMime: Record<string, string> = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      'csv': 'text/csv',
      'txt': 'text/plain'
    };
    
    if (fileExt in extensionToMime) {
      detectedMimeType = extensionToMime[fileExt];
      console.log(`Detected MIME type for .${fileExt}: ${detectedMimeType}`);
    }
  }
  
  // Log detailed file information
  console.log('File details:', {
    originalname: file.originalname,
    originalMimetype: file.mimetype,
    detectedMimeType: detectedMimeType,
    fileExtension: fileExt,
    size: file.size,
    encoding: file.encoding,
    fieldname: file.fieldname,
    buffer: file.buffer ? `Buffer(${file.buffer.length} bytes)` : 'No buffer',
    'content-type': file.mimetype,
    'content-length': file.size,
    'isBuffer': Buffer.isBuffer(file.buffer)
  });
  
  // Define allowed MIME types
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'text/csv',
    'application/csv',
    'text/x-csv',
    'application/octet-stream' // Fallback for curl uploads and other clients
  ];

  // Define allowed file extensions
  const allowedExtensions = ['xlsx', 'xls', 'xlsm', 'csv'];
  
  console.log('MIME type analysis:', {
    originalMimeType: file.mimetype,
    detectedMimeType,
    isAllowedMimeType: allowedMimeTypes.includes(detectedMimeType),
    fileExtension: fileExt,
    isAllowedExtension: allowedExtensions.includes(fileExt)
  });
  
  console.log('=== End File Upload Debug ===');

  // Check if either the MIME type or file extension is allowed
  const isMimeTypeAllowed = allowedMimeTypes.includes(detectedMimeType);
  const isExtensionAllowed = allowedExtensions.includes(fileExt);
  
  if (isMimeTypeAllowed || isExtensionAllowed) {
    console.log('File type accepted:', file.mimetype);
    cb(null, true);
  } else {
    console.log('File type rejected. Allowed types:', allowedMimeTypes);
    console.log('File details on rejection:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    const error = new Error(
      `Unsupported file type: ${file.mimetype}. Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.`
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
  const requestId = req.id?.toString() || `req_${uuidv4()}`;
  const userId = req.user?.oid || 'anonymous';
  
  // Check if file exists
  if (!req.file) {
    logger.error('No file uploaded', { requestId, userId });
    return res.status(400).json(
      createErrorResponse(400, 'No file uploaded', 'Please upload a file')
    );
  }

  const { path: filePath, originalname: fileName, mimetype: originalMimeType } = req.file;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Enhanced MIME type detection
  let detectedMimeType = originalMimeType;
  
  // If MIME type is generic, try to detect based on file extension
  if (['application/octet-stream', 'application/vnd.ms-office', 'application/zip'].includes(originalMimeType)) {
    const extensionToMime: Record<string, string> = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      'csv': 'text/csv',
      'txt': 'text/plain'
    };
    
    if (fileExt in extensionToMime) {
      detectedMimeType = extensionToMime[fileExt];
      logger.debug('Detected MIME type from extension', { 
        requestId, 
        originalMimeType, 
        detectedMimeType, 
        fileExt 
      });
    }
  }

  const fileType = detectedMimeType;

  // Log the upload attempt with detailed file information
  logger.info('File upload started', {
    requestId,
    fileName,
    originalMimeType,
    detectedMimeType,
    fileExt,
    userId,
  });

  // Validate the file type
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'text/csv',
    'application/csv',
    'text/x-csv'
  ];

  if (!allowedMimeTypes.includes(detectedMimeType)) {
    const errorMsg = `Unsupported file type: ${detectedMimeType}. Allowed types: ${allowedMimeTypes.join(', ')}`;
    logger.error(errorMsg, { requestId, fileName, detectedMimeType, fileExt });
    // Clean up the uploaded file
    await fs.unlink(filePath).catch(err => logger.error('Failed to delete temp file', { filePath, error: err }));
    return res.status(400).json(
      createErrorResponse(400, 'Unsupported file type', errorMsg)
    );
  }

  try {
    // Process the file using the ingestion service
    const importMetadata = await ingestionService.importFile(
      filePath,
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
  } finally {
    // Always delete the temporary file
    await fs.unlink(filePath).catch(err => logger.error('Failed to delete temp file in finally', { filePath, error: err }));
  }
}

// Apply authentication middleware if enabled
const authRequired = process.env.AUTH_ENABLED === 'true';

// Define the upload route with conditional authentication
if (authRequired) {
  router.post(
    '/',
    authMiddleware.authenticateToken,
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
        'Unsupported file type',
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
      err.message || 'An error occurred while processing your request'
    )
  );
});

export { router as uploadRouterV2 };
