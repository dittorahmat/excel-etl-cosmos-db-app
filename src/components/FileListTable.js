import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { FileText, Download, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
// Simple formatting utilities
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
const formatDate = (dateString) => {
    try {
        return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    }
    catch (_error) {
        return 'Unknown date';
    }
};
export function FileListTable() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;
    const isMounted = useRef(true);
    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/v2/query/imports', {
                params: {
                    page,
                    pageSize
                }
            });
            if (response?.data?.items) {
                const mappedFiles = response.data.items.map((item) => ({
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
        }
        catch (err) {
            console.error('Error fetching files:', err);
            if (isMounted.current) {
                setError('Failed to load files. Please try again later.');
            }
        }
        finally {
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
    const handleDownload = async (file) => {
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
        }
        catch (error) {
            console.error('Download failed:', error);
        }
    };
    if (loading && files.length === 0) {
        return (_jsxs("div", { className: "flex items-center justify-center h-64", "data-testid": "loading-indicator", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading files..." })] }));
    }
    return (_jsxs("div", { className: "w-full", children: [error && (_jsx("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4", children: error })), _jsx("div", { className: "rounded-md border", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "File" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Size" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Uploaded" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: loading && files.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center", children: _jsxs("div", { className: "flex items-center justify-center space-x-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), _jsx("span", { children: "Loading files..." })] }) }) })) : files.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 5, className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center", children: "No files uploaded yet." }) })) : (files.map((file) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [_jsx(FileText, { className: "h-5 w-5 text-gray-400 mr-2" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-sm font-medium text-gray-900", children: file.name }), _jsxs("span", { className: "text-xs text-gray-500", children: [file.recordCount, " records"] })] })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: `h-2 w-2 rounded-full mr-2 ${file.status === 'completed'
                                                        ? 'bg-green-500'
                                                        : file.status === 'failed'
                                                            ? 'bg-red-500'
                                                            : 'bg-yellow-500'}` }), _jsx("span", { className: "text-sm text-gray-900 capitalize", children: file.status })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: formatBytes(file.size) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: formatDate(file.uploadedAt) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: _jsx("div", { className: "flex justify-end space-x-2", children: _jsx("button", { onClick: () => handleDownload(file), disabled: !file.downloadUrl, title: file.downloadUrl ? 'Download file' : 'Download not available', className: "text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed", children: _jsx(Download, { className: "h-4 w-4" }) }) }) })] }, file.id)))) })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-end space-x-2 py-4", children: [_jsx("button", { onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page === 1 || loading, className: "px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", children: "Previous" }), _jsxs("span", { className: "text-sm text-gray-700", children: ["Page ", page, " of ", totalPages] }), _jsx("button", { onClick: () => setPage((p) => Math.min(totalPages, p + 1)), disabled: page >= totalPages || loading, className: "px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", children: "Next" })] }))] }));
}
