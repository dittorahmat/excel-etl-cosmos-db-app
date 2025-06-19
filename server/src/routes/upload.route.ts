import { Router, type Request, type Response, type NextFunction } from 'express';
import multer, { FileFilterCallback, MulterError } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { initializeAzureServices } from '../config/azure-services.js';
import type { CosmosRecord } from '../types/index.js';
import type { ExcelRecord, UploadResponse } from '../types/models.js';
import { authenticateToken } from '../middleware/auth.js';
import type { MulterError as MulterErrorType, FileTypeError } from '../types/custom.js';

// Extend Express Request type to include our custom properties
// Using the global type augmentation from custom.d.ts
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

const router = Router();

// Initialize multer with memory storage
const storage = multer.memoryStorage();

// File filter for multer
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
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
        error: 'Failed to parse Excel file. The file may be corrupted or in an unsupported format.' 
      };
    }

    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Get headers from the first row
    const headers: string[] = [];
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Extract column headers (first row)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = { c: C, r: range.s.r };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      const cell = worksheet[cellRef];
      headers[C] = cell ? String(cell.v).trim() : `Column_${C + 1}`;
    }
    
    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      raw: true,
      dateNF: 'yyyy-mm-dd', // Consistent date formatting
      defval: '', // Default empty string for empty cells
      blankrows: false, // Skip empty rows
    });
    
    if (!data || data.length === 0) {
      return { 
        success: false, 
        count: 0, 
        error: 'No data found in the Excel file. The file may be empty or contain only headers.' 
      };
    }
    
    // Get Azure services
    const { cosmosDb } = await initializeAzureServices();
    
    // Process and upload records
    const results: CosmosRecord[] = [];
    
    // Process each row in the Excel data
    for (const row of data as Record<string, any>[]) {
      try {
        // Add metadata and ensure all fields are properly typed
        const recordWithMetadata: CosmosRecord & Record<string, any> = {
          // Preserve all original data
          ...Object.entries(row).reduce((acc, [key, value]) => {
            // Convert any nested objects/arrays to strings to avoid Cosmos DB issues
            if (value !== null && typeof value === 'object') {
              acc[key] = JSON.stringify(value);
            } else if (value instanceof Date) {
              acc[key] = value.toISOString();
            } else {
              acc[key] = value;
            }
            return acc;
          }, {} as Record<string, any>),
          
          // Add system metadata
          id: uuidv4(),
          _partitionKey: userId, // Use user ID as partition key for better distribution
          userId,
          fileName,
          containerName,
          uploadDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          documentType: 'excelRecord', // For easier querying
          
          // Add metadata for easier querying
          metadata: {
            fileName,
            uploadDate: new Date().toISOString(),
            rowCount: data.length,
            columnCount: headers.length,
            headers,
          }
        };
        
        // Upload to Cosmos DB
        const result = await cosmosDb.upsertRecord<CosmosRecord>(recordWithMetadata);
        results.push(result as any); // Type assertion needed due to Cosmos DB response type
      } catch (error) {
        console.error('Error processing record:', error);
        // Continue with next record even if one fails
      }
    }

    return {
      success: true,
      count: results.length,
      data: results,
    };
  } catch (error) {
    console.error('Error processing Excel file:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Failed to process Excel file',
    };
  }
};

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload an Excel file for processing
 *     description: Uploads an Excel file, parses its contents, and stores both the raw file and parsed data.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The Excel file to upload (.xlsx, .xls, .csv)
 *     responses:
 *       200:
 *         description: File processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResponse'
 *       400:
 *         description: Bad request (invalid file type, empty file, etc.)
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       413:
 *         description: File too large (max 10MB)
 *       500:
 *         description: Internal server error
 */
// Authentication middleware that works with Express and multer
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);
    next();
  });
};

// Define the route handler function
const uploadHandler = async (req: Request, res: Response<UploadResponse>, next: NextFunction) => {
  // Use a try-catch block to handle errors and ensure proper response types
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
        error: 'No file uploaded',
      });
    }

    if (!req.user?.oid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No user information found in request',
      });
    }

    const userId = req.user.oid;
    const containerName = process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads';
    
    // Get the Azure services
    let blobStorage, cosmosDb;
    try {
      const services = await initializeAzureServices();
      blobStorage = services.blobStorage;
      cosmosDb = services.cosmosDb;
    } catch (error) {
      console.error('Failed to initialize Azure services:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to initialize storage services',
        error: 'Service initialization error',
      });
    }
      
    // Upload file to blob storage with retry logic
    let uploadResult;
    try {
      uploadResult = await blobStorage.uploadFile(containerName, req.file);
    } catch (error) {
      console.error('Error uploading to blob storage:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file to storage',
        error: 'Storage upload error',
      });
    }
      
      const blobUrl = uploadResult.url;

    // Process the uploaded file with user context
    const result = await processExcelFile(
      req.file.buffer,
      req.file.originalname,
      containerName,
      userId
    );
    
    // Handle processing errors
    if (!result.success) {
      // Attempt to clean up the uploaded blob if processing failed
      try {
        await blobStorage.deleteFile(containerName, uploadResult.name);
      } catch (cleanupError) {
        console.error('Error cleaning up blob after processing failure:', cleanupError);
      }
      
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to process file',
        error: result.error || 'File processing error',
      });
    }



    // Update records with blob URL and other metadata
    if (result.data?.length) {
      const updatePromises = result.data.map(record => 
        cosmosDb.upsertRecord({
          ...record,
          blobUrl: uploadResult.url,
          lastModified: new Date().toISOString(),
          blobName: uploadResult.name,
          blobContainer: containerName,
        }).catch(error => {
          console.error('Error updating record with blob URL:', error);
          return null; // Don't fail the entire batch for one record
        })
      );
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
    }

    // Prepare response with detailed metadata
    const responseData = {
      success: true,
      message: 'File processed successfully',
      data: {
        fileId: result.data?.[0]?.id || '',
        fileName: req.file.originalname,
        sheetName: 'Sheet1', // Default or extract from result if available
        rowCount: result.rowCount || result.data?.length || 0,
        columnCount: result.columnCount || result.headers?.length || 0,
        uploadDate: new Date().toISOString(),
        blobUrl: uploadResult.url,
        headers: result.headers || [],
        recordCount: result.count || 0,
        processedAt: new Date().toISOString(),
      },
    };
    
    res.status(200).json(responseData);
  } catch (error: unknown) {
    console.error('Error in upload route:', error);
    
    // More specific error handling
    const err = error as Error & { code?: string; name: string; message: string; stack?: string };
    
    if (err.name === 'MulterError') {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'File too large. Maximum file size is 10MB.',
          message: 'File size exceeds the maximum allowed limit of 10MB.'
        });
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          error: 'Too many files. Only one file can be uploaded at a time.',
          message: 'Only one file can be uploaded at a time.'
        });
      }
    }
    
    if (err.name === 'FileTypeError') {
      const message = err.message || 'Invalid file type. Only Excel and CSV files are allowed.';
      return res.status(400).json({
        success: false,
        error: message,
        message: message
      });
    }
    
    // Default error response
    const errorMessage = 'An error occurred while processing your request';
    res.status(500).json({
      success: false,
      error: errorMessage,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};

// Set up the route with middleware
router.post(
  '/',
  requireAuth,
  upload.single('file'),
  uploadHandler
);

export { uploadHandler, processExcelFile };
export default router;
