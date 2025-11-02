import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import type { Express } from 'express';


const router = Router();

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import * as authMiddleware from '../../middleware/auth.js';
import { fileProcessingQueue } from '../../services/queue/queue.service.js';
import path from 'path';
import fs from 'fs/promises';

// Type imports

const uploadDir = path.join(process.cwd(), 'tmp_uploads');

// Ensure the upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Initialize multer with disk storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Keep the original filename but ensure uniqueness to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 0xFFFF).toString(16);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    // Format: originalname-timestamp-random.extension
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// File filter for multer
export const fileFilter = function(
  req: Request,
  file: Express.Multer.File,
  cb: any
): void {
  // Log the incoming file details for debugging
  console.log('=== File Upload Debug ===');
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  
  // Extract file extension from original name
  const fileExt = file.originalname.split('.').pop()?.toLowerCase() || '';
  
  // Enhanced MIME type detection for common file types
  let detectedMimeType = file.mimetype;
  
  // If MIME type is application/octet-stream, try to detect based on file extension
  if (file.mimetype === 'application/octet-stream' && fileExt) {
    const extensionToMime: Record<string, string> = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      'csv': 'text/csv',
      'txt': 'text/plain'
    };
    
    if (fileExt && fileExt in extensionToMime) {
      detectedMimeType = extensionToMime[fileExt] as string;
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

    const fileTypeError = new Error(
      `Unsupported file type: ${file.mimetype}. Only Excel (.xlsx, .xls, .xlsm) and CSV files are allowed.`
    ) as any;
    fileTypeError.name = 'FileTypeError';
    fileTypeError.code = 'INVALID_FILE_TYPE';
    cb(null, false); // Pass null as the error and false to reject the file
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
  
  // Get user information from authentication or request body
  const userId = req.user?.oid || 'anonymous';
  let uploadedByUserInfo: { name: string; email: string; id: string } | undefined;
  
  // Check if uploadedBy information is provided in the request body
  if (req.body && typeof req.body.uploadedBy === 'string') {
    try {
      uploadedByUserInfo = JSON.parse(req.body.uploadedBy);
    } catch (parseError) {
      logger.warn('Failed to parse uploadedBy JSON', { 
        requestId, 
        userId,
        uploadedBy: req.body.uploadedBy,
        error: parseError instanceof Error ? parseError.message : 'Unknown error'
      });
    }
  }
  
  // Use the uploadedBy user info if available, otherwise fall back to authenticated user
  const effectiveUserId = uploadedByUserInfo?.id || userId || 'anonymous';
  const effectiveUserName = uploadedByUserInfo?.name || req.user?.name || 'Anonymous User';
  const effectiveUserEmail = uploadedByUserInfo?.email || req.user?.email || 'anonymous@example.com';
  
  logger.info('Upload handler started', { 
    requestId, 
    userId: effectiveUserId,
    userName: effectiveUserName,
    userEmail: effectiveUserEmail,
    hasUploadedByInfo: !!uploadedByUserInfo,
    hasFile: !!req.file,
    fileInfo: req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      encoding: req.file.encoding,
      fieldname: req.file.fieldname
    } : undefined
  });
  
  // Check if file exists
  if (!req.file) {
    logger.error('No file uploaded', { 
      requestId, 
      userId,
      headers: req.headers,
      body: req.body
    });
    return res.status(400).json(
      createErrorResponse(400, 'No file uploaded', 'Please upload a file')
    );
  }

  const { path: filePath, originalname: fileName, mimetype: originalMimeType } = req.file;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Enhanced MIME type detection
  let detectedMimeType = originalMimeType;
  
  // If MIME type is generic, try to detect based on file extension
  if (['application/octet-stream', 'application/vnd.ms-office', 'application/zip'].includes(originalMimeType) && fileExt) {
    const extensionToMime: Record<string, string> = {
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'xlsm': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      'csv': 'text/csv',
      'txt': 'text/plain'
    };
    
    if (fileExt && fileExt in extensionToMime) {
      detectedMimeType = extensionToMime[fileExt] as string;
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
    // Add the file to the processing queue
    logger.info('Adding file to processing queue', {
      requestId,
      filePath,
      fileName,
      fileType,
      fileSize: req.file.size,
      userId
    });
    
    const queueItem = fileProcessingQueue.enqueue({
      filePath,
      fileName,
      fileType,
      userId: effectiveUserId || 'anonymous',
      userName: effectiveUserName || 'Anonymous User',
      userEmail: effectiveUserEmail || 'anonymous@example.com'
    });
    
    logger.info('File added to queue successfully', {
      requestId,
      queueItemId: queueItem.id,
      fileName,
      duration: Date.now() - startTime
    });

    // Return success response with queue item ID for tracking
    return res.status(202).json({
      success: true,
      message: 'File queued for processing',
      queueItemId: queueItem.id,
      fileName,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log detailed error information
    logger.error('Failed to queue file for processing', {
      requestId,
      fileName,
      error: errorMessage,
      stack: errorStack,
      duration: Date.now() - startTime,
      fileExists: await fs.access(filePath).then(() => true).catch(() => false),
      fileSize: req.file?.size,
      fileType: req.file?.mimetype,
      originalFileName: req.file?.originalname,
      headers: req.headers,
      body: req.body ? JSON.stringify(req.body).substring(0, 500) + '...' : 'No body',
      errorDetails: error instanceof Error ? 
        Object.getOwnPropertyNames(error).reduce<Record<string, unknown>>((acc, key) => {
          // Use type assertion to access the property in a type-safe way
          // First cast to unknown, then to the target type to ensure type safety
          const errorRecord = error as unknown as Record<string, unknown>;
          return {
            ...acc,
            [key]: errorRecord[key]
          };
        }, {}) : 'No error details'
    });

    // Return error response
    return res.status(500).json(
      createErrorResponse(
        500,
        'Failed to queue file',
        `Failed to queue file for processing: ${errorMessage}`
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

// Add endpoint to check queue status
router.get('/queue/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'ID parameter is required'
    });
  }
  
  const item = fileProcessingQueue.getStatus(id);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Queue item not found'
    });
  }
  
  // If the item is completed, also get the import metadata
  let importMetadata: any = null;
  
  if (item.status === 'completed') {
      try {
        // Import the ingestion service dynamically to avoid circular dependencies
        const { ingestionService } = await import('../../services/ingestion/ingestion.service.js');
        if (id && typeof id === 'string') {
          importMetadata = await ingestionService.getImport(id);
        }
      } catch (error) {
        logger.error('Failed to get import metadata', { error });
      }
    }
  
  return res.status(200).json({
    success: true,
    data: {
      ...item,
      importMetadata
    }
  });
});

// Error handling middleware
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Handle multer errors
  if (err instanceof MulterError) {
    const multerError = err;
    if ((multerError as any).code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json(
        createErrorResponse(
          413,
          'File too large',
          `File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB`
        )
      );
    }
    if ((multerError as any).code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json(
        createErrorResponse(400, 'Too many files', 'Only one file can be uploaded at a time')
      );
    }
  }

  // Handle file type errors
  const typedError = err as Error & { code?: string };
  if (typedError.name === 'FileTypeError' || (typedError.code && typedError.code === 'INVALID_FILE_TYPE')) {
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