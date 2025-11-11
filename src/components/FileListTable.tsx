import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { FileText, Loader2, Trash2, Search, X } from 'lucide-react';
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
  processedBy?: string;
  processedByName?: string;
  processedByEmail?: string;
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
  uploadedBy?: string;
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
 * - File search functionality
 * - File download functionality
 * - File deletion with confirmation
 * - Responsive design
 */
export function FileListTable() {
  // ========================================================================
  // STATE MANAGEMENT
  // ========================================================================
  
  const [files, setFiles] = useState<FileData[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<FileData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // For single file deletion
  const [isBulkDeleting, setIsBulkDeleting] = useState(false); // For bulk deletion
  const [showConfirmDelete, setShowConfirmDelete] = useState<FileData | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isSelectingMultiple, setIsSelectingMultiple] = useState(false);
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const isMounted = useRef(true);

  // ========================================================================
  // SEARCH FUNCTIONALITY
  // ========================================================================
  
  // Debounce search term to avoid excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Filter files based on search term
  useEffect(() => {
    if (!debouncedSearchTerm) {
      setFilteredFiles(files);
    } else {
      const filtered = files.filter(file => 
        file.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (file.uploadedBy && file.uploadedBy.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      );
      setFilteredFiles(filtered);
    }
  }, [debouncedSearchTerm, files]);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================
  
  /**
   * Fetch files from the API with pagination
   */
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', page.toString());
      queryParams.append('pageSize', pageSize.toString());
      
      // Add search term if present
      if (debouncedSearchTerm) {
        queryParams.append('search', debouncedSearchTerm);
      }
      
      const response = await api.get<{ 
        data: {
          items: ImportMetadata[];
          total: number;
          page: number;
          pageSize: number;
          totalPages: number;
        };
      }>(`/api/query/imports?${queryParams.toString()}`);
      
      if (response?.data?.items) {
        // Map API response to component-friendly format
        const mappedFiles: FileData[] = response.data.items.map((item: ImportMetadata) => ({
          id: item.id || item._importId || '',
          name: item.fileName || 'Untitled',
          size: item.fileSize || 0,
          mimeType: item.mimeType || 'application/octet-stream',
          uploadedAt: item.processedAt || item.createdAt || new Date().toISOString(),
          uploadedBy: item.processedByName || item.processedBy || 'Unknown User',
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
  }, [page, pageSize, debouncedSearchTerm]);

  // Fetch files when page or search term changes
  useEffect(() => {
    fetchFiles();
    return () => {
      isMounted.current = false;
    };
  }, [page, pageSize, debouncedSearchTerm]);
  
  // Reset to first page when search term changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearchTerm, page]);

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
      // Attempt to delete the file using the existing API which should handle all deletions
      await api.delete(`/api/query/imports/${fileToDelete.id}`);
      
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
   * Toggle multi-select mode
   */
  const toggleMultiSelect = () => {
    setIsSelectingMultiple(!isSelectingMultiple);
    setSelectedFiles([]);
    setSelectAllChecked(false);
  };

  /**
   * Handle selection of a single file
   */
  const handleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
    setSelectAllChecked(false);
  };

  /**
   * Handle selection of all files
   */
  const handleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedFiles([]);
    } else {
      // Select all currently filtered files
      setSelectedFiles(filteredFiles.map(file => file.id));
    }
    setSelectAllChecked(!selectAllChecked);
  };

  /**
   * Cancel delete operation - close confirmation dialog
   */
  const cancelDelete = () => {
    setShowConfirmDelete(null);
  };

  /**
   * Cancel bulk delete operation
   */
  const cancelBulkDelete = () => {
    setShowBulkDeleteConfirm(false);
  };

  /**
   * Confirm and execute bulk file deletion
   */
  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    setDeleteError(null);
    
    try {
      // Delete all selected files
      const deletePromises = selectedFiles.map(fileId => 
        api.delete(`/api/query/imports/${fileId}`)
      );
      
      await Promise.all(deletePromises);
      
      // Close the confirmation dialog and refresh the file list
      setShowBulkDeleteConfirm(false);
      setSelectedFiles([]);
      setSelectAllChecked(false);
      await fetchFiles();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete some files. Please try again.');
      setShowBulkDeleteConfirm(false);
      await fetchFiles();
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // ========================================================================
  // RENDERING
  // ========================================================================
  
  // Loading state
  if (loading && files.length === 0 && filteredFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-indicator">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading files...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header with multi-select controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-4">
          {!isSelectingMultiple ? (
            <button
              onClick={toggleMultiSelect}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Select Multiple
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleMultiSelect}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <span className="text-sm text-gray-700">
                {selectedFiles.length} of {filteredFiles.length} selected
              </span>
            </div>
          )}
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search files by name or uploader..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

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

      {/* Bulk delete confirmation dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Delete Selected Files</h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelBulkDelete}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={isBulkDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Deleting...
                  </>
                ) : (
                  'Delete Selected'
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
              {isSelectingMultiple && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectAllChecked}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading && filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading files...</span>
                  </div>
                </td>
              </tr>
            ) : filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center" data-testid="no-files-message">
                  {debouncedSearchTerm ? 'No files match your search.' : 'No files uploaded yet.'}
                </td>
              </tr>
            ) : (
              filteredFiles.map((file) => (
                <tr 
                  key={file.id} 
                  className={`hover:bg-gray-50 ${selectedFiles.includes(file.id) ? 'bg-blue-50' : ''}`}
                >
                  {isSelectingMultiple && (
                    <td className="px-6 py-4 whitespace-nowrap w-12">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => handleFileSelection(file.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}
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
                    {file.uploadedBy || 'Unknown User'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isSelectingMultiple ? (
                      <div className="flex justify-center">
                        <span className="text-gray-400">-</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(file)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete file"
                        disabled={isDeleting !== null}
                        data-testid={`delete-button-${file.id}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk delete action buttons when in multi-select mode and files are selected */}
      {isSelectingMultiple && selectedFiles.length > 0 && (
        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => {
              setSelectedFiles([]);
              setSelectAllChecked(false);
            }}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Clear Selection
          </button>
          <button
            onClick={() => setShowBulkDeleteConfirm(true)}
            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Selected ({selectedFiles.length})
          </button>
        </div>
      )}

      {/* Pagination controls */}
      {!debouncedSearchTerm && totalPages > 1 && (
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