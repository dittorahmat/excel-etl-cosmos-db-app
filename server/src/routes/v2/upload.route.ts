import { Router } from 'express';
import type { Request, Response, NextFunction, Express } from 'express';
import multer, { MulterError } from 'multer';

const router = Router();

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import * as authMiddleware from '../../middleware/auth.js';
import { accessControlMiddleware } from '../../middleware/access-control.middleware.js';
import { ingestionService } from '../../services/ingestion/ingestion.service.js';

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



// Configure multer upload
const MAX_FILE_SIZE_MB = 100; // Increased from 10MB to 100MB for larger files
const uploadOptions = {
  storage,
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void
  ): void => {
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
      callback(null, true);
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
      callback(null, false); // Pass null as the error and false to reject the file
    }
  },
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
    files: 10, // Allow up to 10 files in a single request
  },
};

const upload = multer(uploadOptions as import('multer').Options);



// Helper function to create consistent error responses
const createErrorResponse = (status: number, error: string, message: string) => ({
  status,
  error,
  message,
});

/**
 * Upload and process multiple files
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
  const effectiveUserId = uploadedByUserInfo?.id || userId;
  const effectiveUserName = uploadedByUserInfo?.name || 'Anonymous User';
  const effectiveUserEmail = uploadedByUserInfo?.email || 'anonymous@example.com';
  
  // Cast req.files to be an array of Express.Multer.File
  const files = req.files as Express.Multer.File[] || [];
  
  logger.info('Upload handler started', { 
    requestId, 
    userId: effectiveUserId,
    userName: effectiveUserName,
    userEmail: effectiveUserEmail,
    hasUploadedByInfo: !!uploadedByUserInfo,
    fileCount: files.length,
    files: files.map(f => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      encoding: f.encoding,
      fieldname: f.fieldname
    }))
  });
  
  // Check if any files exist
  if (!files || files.length === 0) {
    logger.error('No files uploaded', { 
      requestId, 
      userId,
      headers: req.headers,
      body: req.body
    });
    return res.status(400).json(
      createErrorResponse(400, 'No files uploaded', 'Please upload at least one file')
    );
  }

  try {
    // Process each file individually
    const results: Array<{
      success: boolean;
      importId: string;
      fileName: string;
      totalRows: number;
      validRows: number;
      errorRows: number;
      errors?: Array<{ row: number; error: string; rawData?: unknown }>;
    }> = [];
    const errors: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      const { path: filePath, originalname: fileName, mimetype: originalMimeType } = file;
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
        
        errors.push({
          fileName,
          error: errorMsg
        });
        
        continue; // Skip processing this file
      }

      try {
        // Process the file using the ingestion service
        logger.info('Starting file import with ingestion service', {
          requestId,
          fileName,
          filePath,
          fileType: detectedMimeType,
          fileSize: file.size,
          userId
        });
        
        const importMetadata = await ingestionService.startImport(
          filePath,
          fileName,
          detectedMimeType,
          effectiveUserId, // Use the effective user ID
          effectiveUserName, // Pass the user name
          effectiveUserEmail // Pass the user email
        );

        logger.info('File import completed successfully', {
          requestId,
          fileName,
          importId: importMetadata.id,
          duration: Date.now() - startTime,
          rowsProcessed: importMetadata.totalRows
        });

        results.push({
          success: true,
          importId: importMetadata.id,
          fileName,
          totalRows: importMetadata.totalRows,
          validRows: importMetadata.validRows,
          errorRows: importMetadata.errorRows,
          errors: importMetadata.errors,
        });
      } catch (fileError) {
        const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
        const errorStack = fileError instanceof Error ? fileError.stack : undefined;
        
        logger.error('File import failed', {
          requestId,
          fileName,
          error: errorMessage,
          stack: errorStack,
          duration: Date.now() - startTime,
          fileExists: await fs.access(filePath).then(() => true).catch(() => false),
          fileSize: file.size,
          fileType: file.mimetype,
          originalFileName: file.originalname,
          errorDetails: fileError instanceof Error ? 
            Object.getOwnPropertyNames(fileError).reduce<Record<string, unknown>>((acc, key) => {
              const errorRecord = fileError as unknown as Record<string, unknown>;
              return {
                ...acc,
                [key]: errorRecord[key]
              };
            }, {}) : 'No error details'
        });
        
        errors.push({
          fileName,
          error: `Failed to process file: ${errorMessage}`
        });
        
        // Clean up the failed file
        await fs.unlink(filePath).catch(err => logger.error('Failed to delete temp file after error', { filePath, error: err }));
      }
    }

    // Prepare response based on results
    const totalFiles = files.length;
    const successfulUploads = results.length;
    const failedUploads = errors.length;

    if (successfulUploads > 0) {
      // At least one file was processed successfully
      logger.info('Batch upload completed with partial success', {
        requestId,
        totalFiles,
        successfulUploads,
        failedUploads,
        duration: Date.now() - startTime
      });

      return res.status(200).json({
        success: true,
        message: `Processed ${successfulUploads} of ${totalFiles} files successfully`,
        totalFiles,
        successfulUploads,
        failedUploads,
        results,
        errors: failedUploads > 0 ? errors : undefined
      });
    } else if (failedUploads > 0) {
      // All files failed to process
      logger.error('Batch upload failed', {
        requestId,
        totalFiles,
        failedUploads,
        duration: Date.now() - startTime
      });

      return res.status(400).json({
        success: false,
        message: 'All files failed to process',
        totalFiles,
        successfulUploads,
        failedUploads,
        errors
      });
    } else {
      // No files were processed (edge case)
      return res.status(500).json(
        createErrorResponse(
          500,
          'Upload processing error',
          'No files were processed due to an unexpected error'
        )
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Batch upload handler failed', {
      requestId,
      error: errorMessage,
      stack: errorStack,
      duration: Date.now() - startTime,
      totalFiles: files.length,
      headers: req.headers,
      body: req.body ? JSON.stringify(req.body).substring(0, 500) + '...' : 'No body',
      errorDetails: error instanceof Error ? 
        Object.getOwnPropertyNames(error).reduce<Record<string, unknown>>((acc, key) => {
          const errorRecord = error as unknown as Record<string, unknown>;
          return {
            ...acc,
            [key]: errorRecord[key]
          };
        }, {}) : 'No error details'
    });

    // Clean up all uploaded files in case of error
    for (const file of files) {
      await fs.unlink(file.path).catch(err => logger.error('Failed to delete temp file after error', { filePath: file.path, error: err }));
    }

    return res.status(500).json(
      createErrorResponse(
        500,
        'Upload processing failed',
        `Failed to process upload: ${errorMessage}`
      )
    );
  }
}

// Apply authentication middleware if enabled
const authRequired = process.env.AUTH_ENABLED === 'true';

// Define the upload route with conditional authentication and access control
if (authRequired) {
  router.post(
    '/',
    authMiddleware.authenticateToken,
    accessControlMiddleware,
    upload.array('files', 10), // Accept up to 10 files
    uploadHandler
  );
} else {
  // In development, allow uploads without authentication
  router.post(
    '/',
    accessControlMiddleware,
    upload.array('files', 10), // Accept up to 10 files
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
        createErrorResponse(400, 'Too many files', 'Maximum of 10 files can be uploaded at a time')
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
