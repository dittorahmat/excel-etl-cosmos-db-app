import { useState, useEffect, useRef, useCallback } from 'react';
import { api, getAuthToken } from '../utils/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { FileText, Download, Trash2, Loader2 } from 'lucide-react';

interface ImportMetadata {
  id: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordCount: number;
  processedCount: number;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface FileData extends Omit<ImportMetadata, 'originalFilename' | 'fileSize' | 'createdAt'> {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordCount: number;
}

export function FileListTable() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const isMounted = useRef(true);

  

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<{ items: ImportMetadata[]; total: number; page: number; pageSize: number; totalPages: number }>(
        `/api/v2/imports?page=${page}&pageSize=${pageSize}&sort=-createdAt`
      );
      
      const mappedFiles: FileData[] = data.items.map((item: ImportMetadata) => ({
          id: item.id,
          name: item.fileName,
          size: item.fileSize,
          uploadedAt: item.processedAt || item.lastUpdated || item.createdAt,
          status: item.status,
          recordCount: item.totalRows,
          processedCount: item.validRows,
          errorCount: item.errorRows,
          updatedAt: item.lastUpdated || item.updatedAt,
          error: item.error,
          metadata: item.metadata
        }));
        
        setFiles(mappedFiles);
        setTotalPages(data.totalPages || 1);
        setError(null);
      } catch (err) {
      console.error('Error fetching files:', err);
      if (isMounted.current) {
        setError('Failed to load files. Please try again later.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchFiles();
    return () => {
      isMounted.current = false;
    };
  }, [fetchFiles]);

  useEffect(() => {
    fetchFiles();
  }, [page, fetchFiles]);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      // Use the api instance which uses fetch under the hood
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v2/imports/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download file');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Get the filename from the content-disposition header or use the provided filename
      let downloadFileName = fileName;
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (fileNameMatch && fileNameMatch[1]) {
          downloadFileName = fileNameMatch[1];
        }
      }

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create and trigger a download link
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this import and all its data? This action cannot be undone.')) return;

    try {
      const response = await api.delete(`/api/v2/imports/${fileId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete import');
      }

      // Refresh the file list
      fetchFiles();
    } catch (err) {
      console.error('Error deleting import:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete import');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading files...</span>
      </div>
    );
  }


  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    {file.name}
                  </div>
                </TableCell>
                <TableCell>{formatFileSize(file.size)}</TableCell>
                <TableCell>
                  {file.status === 'completed' ? (
                    <span className="font-medium">{file.processedCount.toLocaleString()}</span>
                  ) : file.status === 'processing' ? (
                    <span className="text-blue-600">Processing {file.processedCount.toLocaleString()} of {file.recordCount.toLocaleString()}</span>
                  ) : (
                    <span>{file.recordCount.toLocaleString()}</span>
                  )}
                  {file.errorCount > 0 && (
                    <span className="ml-1 text-red-600">({file.errorCount} errors)</span>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(file.uploadedAt), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    file.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : file.status === 'processing' || file.status === 'pending'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {file.status}
                    {file.errorCount > 0 && (
                      <span className="ml-1 text-xs opacity-75">({file.errorCount} errors)</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file.id, file.name)}
                    disabled={file.status !== 'completed'}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {files.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No files uploaded yet. Upload a file to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
