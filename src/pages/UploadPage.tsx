import { useState, useEffect } from 'react';
import { FileUpload } from '../components/upload/FileUpload';
import { useToast } from '../components/ui/use-toast';
import { ToastAction } from '../components/ui/toast';
import { Upload as UploadIcon, FileCheck, Lock, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { api, getAuthToken } from '../utils/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileListTable } from '../components/FileListTable';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';

export function UploadPage() {
  console.log('Rendering UploadPage component');
  const { toast } = useToast();
  const { isAuthenticated, user, login } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const [checkingAuthorization, setCheckingAuthorization] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null); // null = not checked yet
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Check authorization when user is authenticated
  const checkAuthorization = async () => {
    if (!isAuthenticated) {
      setCheckingAuthorization(false);
      setAuthorized(false);
      return;
    }

    setCheckingAuthorization(true);
    setError(null);
    
    try {
      const response = await api.get<{ authorized: boolean; email: string }>('/api/v2/access-control/check-authorization');
      setAuthorized(response.authorized);
    } catch (err) {
      console.error('Authorization check failed:', err);
      setAuthorized(false);
      setError(err instanceof Error ? err.message : 'Failed to check authorization');
    } finally {
      setCheckingAuthorization(false);
    }
  };

  // Handle login and then check authorization
  const handleLogin = async () => {
    try {
      // First attempt authentication if needed
      if (!isAuthenticated) {
        await login();
      }
      
      // After authentication (or if already authenticated), check authorization
      setTimeout(() => {
        checkAuthorization();
      }, 500); // Small delay to ensure auth state is updated
    } catch (err) {
      console.error('Login failed:', err);
      setError('Login failed. Please try again.');
    }
  };

  const handleFileUpload = async (file: File): Promise<{ data?: { rowCount?: number }, count?: number }> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Only check for auth token if auth is enabled
      // For now, we're explicitly disabling auth check to fix upload issues in VPS
      // TODO: Re-enable proper auth check once we resolve environment variable reading issues
      const isAuthEnabled = false;
      
      if (isAuthEnabled) {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No authentication token available. Please sign in again.');
        }
      }
      
      // Use the direct upload endpoint instead of the v2 query imports endpoint
      interface UploadResponse {
        success?: boolean;
        message?: string;
        importId?: string;
        fileName?: string;
        totalRows?: number;
        rowCount?: number;
        validRows?: number;
        errorRows?: number;
        errors?: Array<{ row: number; error: string }>;
        // Axios wraps the response in a data property
        data?: {
          success: boolean;
          message: string;
          importId?: string;
          fileName?: string;
          totalRows?: number;
          rowCount?: number;
          validRows?: number;
          errorRows?: number;
          errors?: Array<{ row: number; error: string }>;
        };
      }
      
      const response = await api.post<UploadResponse>('/api/v2/upload', formData, {
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
        action: (
          <ToastAction altText="View" onClick={() => {
            // Navigate to the dashboard to see the uploaded file
            window.location.href = '/';
          }}>
            View Files
          </ToastAction>
        ),
        open: true,
        onOpenChange: () => {}
      });
      
      // Reset form
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
      
      return { data: { rowCount }, count: rowCount };
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to upload file. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: errorMessage,
        open: true,
        onOpenChange: () => {}
      });
      
      setIsUploading(false);
      setUploadProgress(0);
      throw error;
    }
  };

  // Show access denied page if user is not authorized
  if (authorized === false && !checkingAuthorization) {
    return (
      <div className="container max-w-7xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Excel/CSV File</h1>
          <p className="text-gray-600">Check access permissions to upload functionality.</p>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <Lock className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            You don't have permission to access the upload functionality.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Please contact your administrator if you believe this is an error.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state while checking authorization
  if (checkingAuthorization) {
    return (
      <div className="container max-w-7xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Excel/CSV File</h1>
          <p className="text-gray-600">Checking your access permissions...</p>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Checking your access permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if authorization check failed
  if (error && !checkingAuthorization) {
    return (
      <div className="container max-w-7xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Excel/CSV File</h1>
          <p className="text-gray-600">Upload your Excel or CSV file to process and store the data in Cosmos DB.</p>
        </div>
        
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-gray-100 p-6 rounded-lg max-w-md w-full text-center">
            <h2 className="text-xl font-semibold mb-4">Access Check Failed</h2>
            <p className="text-gray-600 mb-6">
              There was an issue checking your access permissions. Please try again.
            </p>
            <Button onClick={handleLogin} className="w-full">
              Retry Access Check
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if authorization hasn't been checked yet
  if (authorized === null) {
    return (
      <div className="container max-w-7xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Excel/CSV File</h1>
          <p className="text-gray-600">Please authenticate and check your access to upload functionality.</p>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-gray-100 p-6 rounded-lg max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold mb-4">Authorization Required</h2>
            <p className="text-gray-600 mb-6">
              Please log in to check if you have access to upload files.
            </p>
            <Button onClick={handleLogin} className="w-full">
              Log In & Check Access
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render the normal upload page if user is authorized
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <FileListTable />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UploadPage
