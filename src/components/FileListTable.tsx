import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { FileText, Download, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Simple formatting utilities
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch (_error) {
    return 'Unknown date';
  }
};

interface ImportMetadata {
  id: string;
  _importId?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  rowCount?: number;
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  createdAt?: string;
  updatedAt?: string;
  processedAt: string;
  error?: string;
  blobUrl?: string;
  [key: string]: unknown;
}

interface FileData {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordCount: number;
  processedCount: number;
  errorCount: number;
  updatedAt: string;
  error?: string;
  metadata: Record<string, unknown>;
  downloadUrl: string;
  downloadFileName: string;
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
      const response = await api.get<{ 
        data: {
          items: ImportMetadata[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      }>(`/api/v2/query/imports?page=${page}&pageSize=${pageSize}`);
      
      if (response?.data?.items) {
        const mappedFiles: FileData[] = response.data.items.map((item: ImportMetadata) => ({
          id: item.id || item._importId || '',
          name: item.fileName || 'Untitled',
          size: item.fileSize || 0,
          mimeType: item.mimeType || 'application/octet-stream',
          uploadedAt: item.processedAt || item.createdAt || new Date().toISOString(),
          status: item.status || 'completed',
          recordCount: item.rowCount || item.totalRows || 0,
          processedCount: item.validRows || 0,
          errorCount: item.errorRows || 0,
          updatedAt: item.updatedAt || item.processedAt || item.createdAt || new Date().toISOString(),
          error: item.error,
          metadata: item,
          downloadUrl: item.blobUrl || '',
          downloadFileName: item.fileName || `file-${item.id || 'unknown'}.xlsx`
        }));

        setFiles(mappedFiles);
        setTotalPages(response.data.totalPages || 1);
        setError(null);
      }
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
  }, [page, fetchFiles]);

  const handleDownload = async (file: FileData) => {
    try {
      if (!file.downloadUrl) {
        console.error('No download URL available for file:', file.id);
        return;
      }
      
      // For direct blob URL access (if blobs are publicly accessible)
      if (file.downloadUrl.startsWith('http')) {
        window.open(file.downloadUrl, '_blank');
        return;
      }
      
      // If we need to go through the API for authentication
      const response = await fetch(file.downloadUrl, {
        headers: {
          'Accept': 'application/octet-stream',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.downloadFileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-indicator">
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && files.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading files...</span>
                  </div>
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No files uploaded yet.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          {file.recordCount} records
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`h-2 w-2 rounded-full mr-2 ${
                          file.status === 'completed'
                            ? 'bg-green-500'
                            : file.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <span className="text-sm text-gray-900 capitalize">
                        {file.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        disabled={!file.downloadUrl}
                        title={file.downloadUrl ? 'Download file' : 'Download not available'}
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
