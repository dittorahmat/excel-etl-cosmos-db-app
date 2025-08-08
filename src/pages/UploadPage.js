import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { FileUpload } from '../components/upload/FileUpload';
import { useToast } from '../components/ui/use-toast';
import { ToastAction } from '../components/ui/toast';
import { Upload as UploadIcon, FileCheck } from 'lucide-react';
import { Card } from '../components/ui/card';
import { api, getAuthToken } from '../utils/api';
export function UploadPage() {
    console.log('Rendering UploadPage component');
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    // Debug log when component mounts
    useEffect(() => {
        console.log('UploadPage mounted');
        return () => {
        };
    }, []);
    const handleFileUpload = async (file) => {
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', file);
            // Get the auth token manually to verify it's available
            const token = await getAuthToken();
            if (!token) {
                throw new Error('No authentication token available. Please sign in again.');
            }
            const response = await api.post('/api/v2/upload', formData, {
                // Don't set Content-Type header - let the browser set it with the correct boundary
                // The API client will automatically add the Authorization header
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setUploadProgress(progress);
                    }
                },
            });
            // Handle successful upload
            if (!response) {
                throw new Error('No response from server');
            }
            // Handle different response structures
            const responseData = response.data || response;
            // If we have a success flag, check it
            if (responseData.success === false) {
                throw new Error(responseData.message || 'Upload failed');
            }
            // If we got here, consider it a success
            const rowCount = responseData.totalRows || responseData.rowCount || 0;
            const message = responseData.message || `Successfully uploaded ${file.name}`;
            toast({
                title: 'Upload Successful',
                description: `${message}${rowCount ? ` Processed ${rowCount} rows.` : ''}`,
                action: (_jsx(ToastAction, { altText: "View", onClick: () => {
                        // Navigate to the dashboard to see the uploaded file
                        window.location.href = '/';
                    }, children: "View Files" })),
                open: true,
                onOpenChange: () => { }
            });
            // Reset form
            setUploadProgress(100);
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
            }, 1000);
            return { data: { rowCount }, count: rowCount };
        }
        catch (error) {
            console.error('Upload error:', error);
            let errorMessage = 'Failed to upload file. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'string') {
                errorMessage = error;
            }
            else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = String(error.message);
            }
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: errorMessage,
                open: true,
                onOpenChange: () => { }
            });
            setIsUploading(false);
            setUploadProgress(0);
            throw error;
        }
    };
    return (_jsxs("div", { className: "container max-w-7xl py-8 px-4", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("h1", { className: "text-3xl font-bold mb-2 flex items-center", children: ["Upload Excel/CSV File", _jsx("span", { className: "ml-4 text-sm font-normal text-gray-500", children: "Component is mounted" })] }), _jsx("p", { className: "text-gray-600", children: "Upload your Excel or CSV file to process and store the data in Cosmos DB." })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs(Card, { className: "p-6 h-full flex flex-col min-h-[400px] border", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "File Upload" }), _jsxs("div", { className: "flex-grow flex flex-col justify-center", children: [_jsx(FileUpload, { onUpload: handleFileUpload, accept: ['.xlsx', '.xls', '.csv'], maxSize: 10 * 1024 * 1024, progress: uploadProgress, isUploading: isUploading }), _jsxs("p", { className: "text-sm text-gray-500 mt-4 text-center", children: ["Debug: isUploading=", isUploading ? 'true' : 'false', ", progress=", uploadProgress, "%"] })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "p-6 border", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx("div", { className: "p-2 mr-3 bg-blue-100 rounded-full flex items-center justify-center", children: _jsx(UploadIcon, { className: "h-5 w-5 text-blue-600" }) }), _jsx("h2", { className: "text-xl font-semibold", children: "How to upload files" })] }), _jsxs("ul", { className: "space-y-2 text-sm text-gray-600", children: [_jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "1." }), _jsx("span", { children: "Click \"Select File\" or drag and drop your file into the upload area" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "2." }), _jsx("span", { children: "Supported formats: .xlsx, .xls, .csv (Max 10MB)" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "3." }), _jsx("span", { children: "Click \"Upload File\" to process your data" })] })] })] }), _jsxs(Card, { className: "p-6 border", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx("div", { className: "p-2 mr-3 bg-green-100 rounded-full flex items-center justify-center", children: _jsx(FileCheck, { className: "h-5 w-5 text-green-600" }) }), _jsx("h2", { className: "text-xl font-semibold", children: "File Requirements" })] }), _jsxs("ul", { className: "space-y-2 text-sm text-gray-600", children: [_jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "First row should contain column headers" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "Each subsequent row should contain data" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "Empty rows will be skipped" })] }), _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "mr-2", children: "\u2022" }), _jsx("span", { children: "Maximum file size: 10MB" })] })] })] })] })] })] }));
}
export default UploadPage;
