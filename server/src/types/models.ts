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
    fileId: string;
    fileName: string;
    sheetName: string;
    rowCount: number;
    columnCount: number;
    uploadDate: string;
    blobUrl: string;
  };
  error?: string;
  details?: unknown;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  message: string;
  details?: unknown;
  stack?: string;
}
