import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { FileText, Loader2, Trash2 } from 'lucide-react';
import { formatBytes, formatDate } from '../utils/formatters';

// ========================================================================
// TYPE DEFINITIONS
// ========================================================================

/**
 * Metadata structure for imported files from the backend
 */
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

/**
 * File data structure used in the component state
 */
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

// ========================================================================
// MAIN COMPONENT
// ========================================================================

/**
 * FileListTable component displays a table of uploaded files with actions
 * Features:
 * - File listing with pagination
 * - File download functionality
 * - File deletion with confirmation
 * - Responsive design
 */
export function FileListTable() {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<FileData | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const isMounted = useRef(true);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================
  
  /**
   * Fetch files from the API with pagination
   */
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
        // Map API response to component-friendly format
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

        // Debug log to see what data we're getting
        console.log('File data from API:', response.data.items);
        console.log('Mapped file data:', mappedFiles);

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

  // Fetch files when page changes
  useEffect(() => {
    fetchFiles();
    return () => {
      isMounted.current = false;
    };
  }, [page, fetchFiles]);

  // ========================================================================
  // ACTION HANDLERS
  // ========================================================================
  
  /**

   * Handle delete button click - show confirmation dialog

   * @param file - File to delete

   */

  const handleDelete = (file: FileData) => {

    setShowConfirmDelete(file);

  };

  /**
   * Confirm and execute file deletion
   */
  const confirmDelete = async () => {
    if (!showConfirmDelete) return;
    
    const fileToDelete = showConfirmDelete;
    setIsDeleting(fileToDelete.id);
    setDeleteError(null);
    
    try {
      // Attempt to delete the file
      await api.delete(`/api/v2/query/imports/${fileToDelete.id}`);
      
      // Close the confirmation dialog and refresh the file list
      setShowConfirmDelete(null);
      await fetchFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      // Show error but still close dialog and refresh
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete file. Please try again.');
      setShowConfirmDelete(null);
      await fetchFiles();
    } finally {
      setIsDeleting(null);
    }
  };

  /**
   * Cancel delete operation - close confirmation dialog
   */
  const cancelDelete = () => {
    setShowConfirmDelete(null);
  };

  // ========================================================================
  // RENDERING
  // ========================================================================
  
  // Loading state
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
      {/* Error messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {deleteError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {deleteError}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete "{showConfirmDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={isDeleting !== null}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isDeleting !== null}
              >
                {isDeleting === showConfirmDelete.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files table */}
      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center" data-testid="no-files-message">
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
                          {file.recordCount} records ({file.processedCount} valid)
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
                        {file.status === 'processing' && file.processedCount !== undefined && file.recordCount !== undefined
                          ? `Processing ${file.processedCount} of ${file.recordCount}`
                          : file.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatBytes(file.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleDelete(file)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete file"
                      disabled={isDeleting !== null}
                      data-testid={`delete-button-${file.id}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
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