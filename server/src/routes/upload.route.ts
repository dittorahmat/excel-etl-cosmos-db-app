import { Router, Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import { initializeAzureServices, type CosmosRecord } from '../config/azure.js';
import type { ExcelRecord, UploadResponse } from '../types/models.js';

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
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.FILE_SIZE_LIMIT || '10485760'), // 10MB default
  },
});

// Process Excel file and upload to Cosmos DB
const processExcelFile = async (
  fileBuffer: Buffer,
  fileName: string,
  containerName: string
): Promise<{ success: boolean; count: number; error?: string; data?: any[] }> => {
  try {
    // Parse the Excel file
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: true });
    
    if (!data || data.length === 0) {
      return { success: false, count: 0, error: 'No data found in the Excel file' };
    }
    
    // Get Azure services
    const { cosmosDb } = await initializeAzureServices();
    
    // Process and upload records
    const results = [];
    for (const record of data as Record<string, any>[]) {
      try {
        // Add metadata to the record
        const recordWithMetadata: CosmosRecord & Record<string, any> = {
          ...record,
          id: uuidv4(),
          fileName,
          containerName,
          uploadedAt: new Date().toISOString(),
        };
        
        // Upload to Cosmos DB
        const result = await cosmosDb.upsertRecord(recordWithMetadata);
        results.push(result);
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

// Upload file endpoint
router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response<UploadResponse>, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
          error: 'No file uploaded',
        });
      }

      // Get the Azure services
      const { blobStorage, cosmosDb } = await initializeAzureServices();
      
      // Upload file to blob storage
      const uploadResult = await blobStorage.uploadFile(
        process.env.AZURE_STORAGE_CONTAINER || 'excel-uploads',
        req.file
      );
      
      const blobUrl = uploadResult.url;

      // Process the uploaded file
      const result = await processExcelFile(
        req.file.buffer,
        req.file.originalname,
        process.env.COSMOS_DB_CONTAINER || 'excel-uploads'
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to process file',
          error: result.error,
        });
      }

      // Update the blob URL in the records if we have results
      if (result.data && result.data.length > 0) {
        for (const record of result.data) {
          try {
            await cosmosDb.upsertRecord({
              ...record,
              blobUrl,
            });
          } catch (error) {
            console.error('Error updating record with blob URL:', error);
            // Continue with next record even if one fails
          }
        }
      }

      res.status(200).json({
        success: true,
        message: 'File processed successfully',
        data: {
          fileId: result.data?.[0]?.id || '',
          fileName: req.file.originalname,
          sheetName: result.data?.[0]?.sheetName || 'Sheet1',
          rowCount: result.data?.[0]?.rowCount || 0,
          columnCount: result.data?.[0]?.columnCount || 0,
          uploadDate: result.data?.[0]?.uploadDate || new Date().toISOString(),
          blobUrl,
        },
      });
    } catch (error) {
      console.error('Error in upload route:', error);
      next(error);
    }
  }
);

export default router;
