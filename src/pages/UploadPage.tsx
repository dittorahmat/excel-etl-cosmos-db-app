import { useState } from 'react';
import { FileUpload } from '../components/upload/FileUpload.js';
import { useToast } from '../components/ui/use-toast.js';
import { ToastAction } from '../components/ui/toast.js';
import { Upload, FileCheck } from 'lucide-react';

export function UploadPage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      // Set up progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      const response = await new Promise<Response>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText,
            }));
          } else {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', '/api/upload');
        xhr.responseType = 'json';
        xhr.send(formData);
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();
      
      toast({
        title: 'File uploaded successfully!',
        description: `Processed ${result.count} records.`,
        open: true,
        onOpenChange: (open) => {
          if (!open) {
            // Handle toast dismiss if needed
          }
        },
        action: (
          <ToastAction altText="View details" onClick={() => {
            // Navigate to the file details page or show a modal
            console.log('View file details', result);
          }}>
            View Details
          </ToastAction>
        ),
      });

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        open: true,
        onOpenChange: (open) => {
          if (!open) {
            // Handle toast dismiss if needed
          }
        },
      });
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Upload Excel/CSV File</h1>
        <p className="text-muted-foreground">
          Upload your Excel or CSV file to process and store the data in Cosmos DB.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="md:col-span-1">
          <FileUpload 
            onUpload={handleFileUpload}
            accept={['.xlsx', '.xls', '.csv']}
            maxSize={10 * 1024 * 1024} // 10MB
            progress={uploadProgress}
            isUploading={isUploading}
          />
        </div>
        
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-full bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">How to upload files</h2>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="mr-2 font-medium">1.</span>
                <span>Click "Select File" or drag and drop your file into the upload area.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-medium">2.</span>
                <span>Supported formats: .xlsx, .xls, .csv (Max 10MB)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-medium">3.</span>
                <span>Click "Upload File" to process your data.</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-full bg-primary/10">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">File Requirements</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
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
          </div>
        </div>
      </div>
    </div>
  );
}
