import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { FileUpload } from '../components/upload/FileUpload.js';
import { useToast } from '../components/ui/use-toast.js';
import { ToastAction } from '../components/ui/toast.js';
import { Upload, FileCheck } from 'lucide-react';
import { api } from '../utils/api.js';
export function UploadPage() {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const handleFileUpload = async (file) => {
        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Use the API client to upload the file
            const result = await api.post('/upload', formData, {
                headers: {
                    // Let the browser set the Content-Type with the boundary
                    'Content-Type': undefined
                },
                // Add progress tracking if needed (though this requires a different approach with fetch)
                // For now, we'll just show an indeterminate progress
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setUploadProgress(progress);
                    }
                }
            });
            
            // If we get here, the upload was successful
            // Show success toast
            toast({
                title: 'File uploaded successfully!',
                description: result.count ? `Processed ${result.count} records.` : 'File processed successfully.',
                open: true,
                onOpenChange: (open) => {
                    if (!open) {
                        // Handle toast dismiss if needed
                    }
                },
                action: (_jsx(ToastAction, { altText: "View details", onClick: () => {
                        // Navigate to the file details page or show a modal
                        console.log('View file details', result);
                    }, children: "View Details" })),
            });
            return result;
        } catch (error) {
            console.error('Error uploading file:', error);
            
            // Extract a user-friendly error message
            let errorMessage = 'An error occurred while uploading the file';
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                const { data, status } = error.response;
                console.error('Server responded with error:', status, data);
                errorMessage = data?.message || `Server error: ${status}`;
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received:', error.request);
                errorMessage = 'No response from server. Please check your connection.';
            } else if (error.message) {
                // Something happened in setting up the request that triggered an Error
                console.error('Request setup error:', error.message);
                errorMessage = error.message;
            }
            
            // Show error toast
            toast({
                title: 'Error uploading file',
                description: errorMessage,
                variant: 'destructive',
                open: true,
                action: _jsx(ToastAction, { altText: "Try again", onClick: () => window.location.reload(), children: "Try again" }),
            });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (_jsxs("div", { className: "container mx-auto py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Upload Excel/CSV File" }), _jsx("p", { className: "text-muted-foreground", children: "Upload your Excel or CSV file to process and store the data in Cosmos DB." })] }), _jsxs("div", { className: "grid gap-8 md:grid-cols-2", children: [_jsx("div", { className: "md:col-span-1", children: _jsx(FileUpload, { onUpload: handleFileUpload, accept: ['.xlsx', '.xls', '.csv'], maxSize: 10 * 1024 * 1024, progress: uploadProgress, isUploading: isUploading }) }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-lg border bg-card p-6", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [_jsx("div", { className: "p-2 rounded-full bg-primary/10", children: _jsx(Upload, { className: "h-5 w-5 text-primary" }) }), _jsx("h2", { className: "text-lg font-semibold", children: "How to upload files" })] }), _jsxs("ol", { className: "space-y-3 text-sm text-muted-foreground", children: [_jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2 font-medium", children: "1." }), _jsx("span", { children: "Click \"Select File\" or drag and drop your file into the upload area." })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2 font-medium", children: "2." }), _jsx("span", { children: "Supported formats: .xlsx, .xls, .csv (Max 10MB)" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2 font-medium", children: "3." }), _jsx("span", { children: "Click \"Upload File\" to process your data." })] })] })] }), _jsxs("div", { className: "rounded-lg border bg-card p-6", children: [_jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [_jsx("div", { className: "p-2 rounded-full bg-primary/10", children: _jsx(FileCheck, { className: "h-5 w-5 text-primary" }) }), _jsx("h2", { className: "text-lg font-semibold", children: "File Requirements" })] }), _jsxs("ul", { className: "space-y-2 text-sm text-muted-foreground", children: [_jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "First row should contain column headers" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "Each subsequent row should contain data" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "Empty rows will be skipped" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "Maximum file size: 10MB" })] })] })] })] })] })] }));
}
