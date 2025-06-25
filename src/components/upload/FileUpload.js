import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';
import { cn } from '../../lib/utils.js';
import { Upload, FileText, X } from 'lucide-react';
export function FileUpload({ onUpload, accept = ['.xlsx', '.xls', '.csv'], maxSize = 10 * 1024 * 1024, // 10MB
className, progress = 0, isUploading = false, }) {
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const [localIsUploading, setLocalIsUploading] = useState(false);
    const isUploadingLocal = isUploading !== undefined ? isUploading : localIsUploading;
    const onDrop = useCallback((acceptedFiles) => {
        setError(null);
        const selectedFile = acceptedFiles[0];
        if (!selectedFile) {
            setError('No file selected');
            return;
        }
        // Check file type
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || '';
        if (fileExt && !accept.some(ext => ext.toLowerCase() === `.${fileExt}`)) {
            setError(`Invalid file type. Please upload one of: ${accept.join(', ')}`);
            return;
        }
        // Check file size
        if (selectedFile.size > (maxSize || 0)) {
            setError(`File is too large. Maximum size is ${(maxSize || 0) / (1024 * 1024)}MB`);
            return;
        }
        setFile(selectedFile);
    }, [accept, maxSize]);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
        maxSize,
    });
    const handleUpload = async () => {
        if (!file)
            return;
        try {
            setLocalIsUploading(true);
            setError(null);
            await onUpload(file);
            // Reset after successful upload
            setFile(null);
        }
        catch (err) {
            console.error('Upload failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload file');
        }
        finally {
            setLocalIsUploading(false);
        }
    };
    const removeFile = () => {
        setFile(null);
        setError(null);
    };
    return (_jsxs(Card, { className: cn('w-full max-w-2xl mx-auto', className), children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "Upload Excel/CSV File" }), _jsx(CardDescription, { children: "Upload your Excel or CSV file to process and store the data." })] }), _jsxs(CardContent, { children: [_jsxs("div", { ...getRootProps(), className: cn('border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors', isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50', className), children: [_jsx("input", { ...getInputProps() }), _jsxs("div", { className: "flex flex-col items-center justify-center space-y-4", children: [_jsx("div", { className: "p-3 rounded-full bg-primary/10", children: _jsx(Upload, { className: "w-6 h-6 text-primary" }) }), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-medium", children: isDragActive ? 'Drop the file here' : 'Drag and drop your file here' }), _jsx("p", { className: "text-xs text-muted-foreground", children: `Supports: ${accept.join(', ')} (Max: ${maxSize / (1024 * 1024)}MB)` })] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", children: "Select File" })] })] }), file && (_jsx("div", { className: "mt-4 p-4 border rounded-lg bg-card", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(FileText, { className: "h-5 w-5 text-muted-foreground" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium truncate", children: file.name }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [(file.size / (1024 * 1024)).toFixed(2), " MB"] })] })] }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", onClick: removeFile, className: "text-muted-foreground hover:text-destructive", children: _jsx(X, { className: "h-4 w-4" }) })] }) })), error && (_jsx("div", { className: "mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md", children: error })), _jsx("div", { className: "mt-6 flex justify-end", children: _jsxs("div", { className: "w-full space-y-2", children: [_jsx(Button, { type: "button", onClick: handleUpload, disabled: !file || isUploadingLocal, className: "w-full sm:w-auto", children: isUploadingLocal ? 'Uploading...' : 'Upload File' }), isUploadingLocal && progress > 0 && (_jsx("div", { className: "w-full bg-gray-200 rounded-full h-2.5", children: _jsx("div", { className: "bg-blue-600 h-2.5 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) })), isUploadingLocal && (progress || 0) > 0 && (_jsxs("p", { className: "text-xs text-muted-foreground text-right", children: [progress, "% uploaded"] }))] }) })] })] }));
}
