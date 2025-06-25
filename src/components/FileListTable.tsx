import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken } from '../utils/api.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table.js';
import { Button } from './ui/button.js';
import { api } from '../utils/api.js';
import { format } from 'date-fns';
import { FileText, Download, Trash2, Loader2 } from 'lucide-react';

interface FileData {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'processed' | 'processing' | 'error';
  recordCount?: number;
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
      const response = await api.get(`/api/files?page=${page}&pageSize=${pageSize}`);

      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }

      const data = await response.json();
      if (isMounted.current) {
        setFiles(data.items);
        setTotalPages(Math.ceil(data.total / pageSize));
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
  }, [fetchFiles]);

  useEffect(() => {
    fetchFiles();
  }, [page, fetchFiles]);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      // Use the api instance which uses fetch under the hood
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create and trigger a download link
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
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
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await api.delete(`/api/files/${fileId}`);

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      // Refresh the file list
      fetchFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
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
                <TableCell>{file.recordCount || '-'}</TableCell>
                <TableCell>
                  {format(new Date(file.uploadedAt), 'MMM d, yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    file.status === 'processed'
                      ? 'bg-green-100 text-green-800'
                      : file.status === 'processing'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {file.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file.id, file.name)}
                    disabled={file.status !== 'processed'}
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
