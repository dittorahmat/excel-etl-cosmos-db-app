export interface ExcelRecord {
  id: string;
  userId: string;
  fileName: string;
  uploadDate: string;
  blobUrl: string;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  data: Record<string, unknown>[];
  metadata: {
    size: number;
    mimeType: string;
    uploadDate: string;
  };
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    fileId?: string; // Make optional as it might not always be available immediately
    fileName: string;
    sheetName?: string; // Make optional
    rowCount: number;
    columnCount: number;
    uploadDate?: string; // Make optional
    blobUrl: string;
    headers?: string[]; // Add headers
    recordCount?: number; // Add recordCount
    processedAt?: string; // Add processedAt
  };
  error?: string;
  details?: unknown;
  statusCode?: number; // Add statusCode
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  message: string;
  details?: unknown;
  stack?: string;
}
