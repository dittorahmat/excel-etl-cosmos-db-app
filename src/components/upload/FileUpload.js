import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button';
import { Upload as UploadIcon, FileText, X } from 'lucide-react';
const Progress = ({ value, className = '' }) => (_jsx("div", { className: `h-2 w-full bg-muted rounded-full overflow-hidden ${className}`, children: _jsx("div", { className: "h-full bg-primary transition-all duration-300", style: { width: `${Math.min(100, Math.max(0, value))}%` } }) }));
const MIME_TYPES = {
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
};
export function FileUpload({ onUpload, accept = ['.xlsx', '.xls', '.csv'], maxSize = 10 * 1024 * 1024, // 10MB
className = '', progress = 0, isUploading = false, }) {
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const onDrop = useCallback((acceptedFiles, fileRejections) => {
        setError(null);
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
            if (extension && MIME_TYPES[extension]) {
                // Create a new File object with the correct MIME type
                const mimeType = MIME_TYPES[extension];
                const newFile = new File([file], file.name, {
                    type: mimeType,
                    lastModified: file.lastModified
                });
                setFile(newFile);
            }
            else {
                setFile(file);
            }
        }
        else if (fileRejections.length > 0) {
            const { errors } = fileRejections[0];
            let errorMessage = errors[0].message;
            if (errors[0].code === 'file-too-large') {
                errorMessage = `File is too large. Max size is ${maxSize / 1024 / 1024}MB`;
            }
            setError(errorMessage);
            return;
        }
    }, [maxSize]);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: accept.reduce((acc, ext) => {
            const mimeType = MIME_TYPES[ext];
            if (mimeType) {
                return { ...acc, [mimeType]: [] };
            }
            return acc;
        }, {}),
        maxSize,
        multiple: false,
        disabled: isUploading
    });
    const handleUpload = async () => {
        if (!file)
            return;
        try {
            await onUpload(file);
            setFile(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload file');
        }
    };
    const handleRemoveFile = () => {
        setFile(null);
        setError(null);
    };
    // Log component state changes in development
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('FileUpload state:', {
                hasFile: !!file,
                isUploading: isUploading,
                progress,
                error
            });
        }
    }, [file, isUploading, progress, error]);
    return (_jsxs("div", { ...getRootProps(), className: `flex flex-col items-center p-6 border-2 border-dashed rounded-lg transition-colors ${isDragActive ? 'bg-muted/50' : 'bg-background'} ${error ? 'border-destructive' : 'border-border'} ${isUploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${className}`, children: [_jsx("input", { ...getInputProps(), "data-testid": "file-upload-input" }), isUploading ? (_jsxs("div", { className: "w-full text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Uploading... ", Math.round(progress), "%"] }), _jsx(Progress, { value: progress, className: "mt-4 h-2" })] })) : file ? (_jsxs("div", { className: "flex items-center w-full", children: [_jsx(FileText, { className: "h-6 w-6 mr-3 flex-shrink-0" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-sm font-medium", children: file.name }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [(file.size / 1024 / 1024).toFixed(2), " MB"] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Button, { type: "button", size: "sm", onClick: (e) => {
                                    e.stopPropagation();
                                    handleUpload();
                                }, disabled: isUploading, className: "px-3 py-1 h-8 text-xs", children: isUploading ? 'Uploading...' : 'Upload' }), _jsx("button", { type: "button", onClick: (e) => {
                                    e.stopPropagation();
                                    handleRemoveFile();
                                }, disabled: isUploading, className: "p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground", "data-testid": "remove-file-button", children: _jsx(X, { className: "h-4 w-4" }) })] })] })) : (_jsxs("div", { className: "text-center", children: [_jsx(UploadIcon, { className: "h-12 w-12 mx-auto mb-2 text-muted-foreground" }), _jsx("h4", { className: "font-medium", children: isDragActive ? 'Drop the file here' : 'Drag & drop a file here' }), _jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "or click to select a file" }), _jsxs("p", { className: "text-xs text-muted-foreground mt-2", children: ["Supported formats: ", accept.join(', '), " (max ", maxSize / 1024 / 1024, "MB)"] })] })), error && (_jsx("p", { className: "text-sm text-destructive mt-2 text-center", "data-testid": "error-message", children: error }))] }));
}
