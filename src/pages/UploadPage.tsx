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
      console.log('UploadPage unmounted');
    };
  }, []);

  const handleFileUpload = async (file: File) => {
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
      
      // Use the authenticated API client with v2 imports endpoint
      const response = await api.post('/api/v2/imports', formData, {
        // Don't set Content-Type header - let the browser set it with the correct boundary
        // The API client will automatically add the Authorization header
        onUploadProgress: (progressEvent: ProgressEvent<EventTarget> & { 
          lengthComputable: boolean; 
          loaded: number; 
          total: number 
        }) => {
          if (progressEvent.lengthComputable) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(progress);
          }
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as Record<string, unknown>));
        throw new Error((errorData as { error?: string }).error || 'Failed to upload file');
      }

      const result = await response.json() as { data?: { rowCount?: number }, count?: number };
      
      // Handle v2 response format which might be different
      const recordCount = result.data?.rowCount ?? result.count ?? 0;
      
      toast({
        title: 'File uploaded successfully!',
        description: `Processed ${recordCount} records.`,
        action: (
          <ToastAction 
            altText="View details" 
            onClick={() => console.log('View file details', result)}
          >
            View Details
          </ToastAction>
        ),
        open: true,
        onOpenChange: () => {}
      });

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        open: true,
        onOpenChange: () => {}
      });
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container max-w-7xl py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center">
          Upload Excel/CSV File
          <span className="ml-4 text-sm font-normal text-gray-500">
            Component is mounted
          </span>
        </h1>
        <p className="text-gray-600">
          Upload your Excel or CSV file to process and store the data in Cosmos DB.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 h-full flex flex-col min-h-[400px] border">
          <h2 className="text-xl font-semibold mb-4">File Upload</h2>
          <div className="flex-grow flex flex-col justify-center">
            <FileUpload 
              onUpload={handleFileUpload}
              accept={['.xlsx', '.xls', '.csv']}
              maxSize={10 * 1024 * 1024} // 10MB
              progress={uploadProgress}
              isUploading={isUploading}
            />
            <p className="text-sm text-gray-500 mt-4 text-center">
              Debug: isUploading={isUploading ? 'true' : 'false'}, progress={uploadProgress}%
            </p>
          </div>
        </Card>
        
        <div className="space-y-6">
          <Card className="p-6 border">
            <div className="flex items-center mb-4">
              <div className="p-2 mr-3 bg-blue-100 rounded-full flex items-center justify-center">
                <UploadIcon className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold">How to upload files</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">1.</span>
                <span>Click "Select File" or drag and drop your file into the upload area</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">2.</span>
                <span>Supported formats: .xlsx, .xls, .csv (Max 10MB)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">3.</span>
                <span>Click "Upload File" to process your data</span>
              </li>
            </ul>
          </Card>

          <Card className="p-6 border">
            <div className="flex items-center mb-4">
              <div className="p-2 mr-3 bg-green-100 rounded-full flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold">File Requirements</h2>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>First row should contain column headers</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Each subsequent row should contain data</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Empty rows will be skipped</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Maximum file size: 10MB</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default UploadPage
