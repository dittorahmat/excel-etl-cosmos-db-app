import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken } from '../utils/api.js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from './ui/table.js';
import { Button } from './ui/button.js';
import { api } from '../utils/api.js';
import { format } from 'date-fns';
import { FileText, Download, Trash2, Loader2 } from 'lucide-react';
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
            // Use the correct pagination parameters expected by the server
            // The api.get() already parses the JSON response
            const data = await api.get(`/api/data?page=${page}&limit=${pageSize}`);
            
            if (isMounted.current) {
                setFiles(Array.isArray(data?.items) ? data.items : []);
                setTotalPages(data?.totalPages || 1);
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
    }, [fetchFiles]);
    useEffect(() => {
        fetchFiles();
    }, [page, fetchFiles]);
    const handleDownload = async (fileId, fileName) => {
        try {
            // Use the api instance which uses fetch under the hood
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/data/${fileId}/download`, {
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
        }
        catch (err) {
            console.error('Error downloading file:', err);
            setError('Failed to download file');
        }
    };
    const handleDelete = async (fileId) => {
        if (!window.confirm('Are you sure you want to delete this file?'))
            return;
        try {
            const response = await api.delete(`/api/data/${fileId}`);
            if (!response.ok) {
                throw new Error('Failed to delete file');
            }
            // Refresh the file list
            fetchFiles();
        }
        catch (err) {
            console.error('Error deleting file:', err);
            setError('Failed to delete file');
        }
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    if (loading && files.length === 0) {
        return (_jsxs("div", { className: "flex items-center justify-center h-64", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin" }), _jsx("span", { className: "ml-2", children: "Loading files..." })] }));
    }
    return (_jsxs("div", { className: "w-full", children: [error && (_jsx("div", { className: "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4", children: error })), _jsx("div", { className: "rounded-md border", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Name" }), _jsx(TableHead, { children: "Size" }), _jsx(TableHead, { children: "Records" }), _jsx(TableHead, { children: "Uploaded" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { className: "text-right", children: "Actions" })] }) }), _jsxs(TableBody, { children: [files.map((file) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "font-medium", children: _jsxs("div", { className: "flex items-center", children: [_jsx(FileText, { className: "h-4 w-4 mr-2" }), file.name] }) }), _jsx(TableCell, { children: formatFileSize(file.size) }), _jsx(TableCell, { children: file.recordCount || '-' }), _jsx(TableCell, { children: format(new Date(file.uploadedAt), 'MMM d, yyyy HH:mm') }), _jsx(TableCell, { children: _jsx("span", { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${file.status === 'processed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : file.status === 'processing'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-red-100 text-red-800'}`, children: file.status }) }), _jsxs(TableCell, { className: "text-right", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => handleDownload(file.id, file.name), disabled: file.status !== 'processed', children: [_jsx(Download, { className: "h-4 w-4 mr-1" }), "Download"] }), _jsxs(Button, { variant: "ghost", size: "sm", className: "text-red-600 hover:text-red-800", onClick: () => handleDelete(file.id), children: [_jsx(Trash2, { className: "h-4 w-4 mr-1" }), "Delete"] })] })] }, file.id))), files.length === 0 && !loading && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 6, className: "text-center py-8 text-muted-foreground", children: "No files uploaded yet. Upload a file to get started." }) }))] })] }) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-end space-x-2 py-4", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "text-sm", children: ["Page ", page, " of ", totalPages] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages, children: "Next" })] }))] }));
}
