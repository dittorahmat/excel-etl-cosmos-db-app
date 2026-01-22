import { useState } from 'react';
import { FileUpload } from '../components/upload/FileUpload';
import { Upload as UploadIcon, FileCheck, Lock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { api, getAuthToken } from '../utils/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileListTable } from '../components/FileListTable';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';

export function UploadPage() {
  console.log('Rendering UploadPage component');

  // Function to validate the required columns in an uploaded file
  const validateFileHeaders = (file: File): Promise<{ isValid: boolean; missingHeaders?: string[]; error?: string }> => {
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        // For CSV files, use text reader
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const csvText = e.target?.result as string;

            // Simple CSV parsing - just get the first line for headers
            const lines = csvText.split('\n');
            if (lines.length === 0) {
              console.error(`No data found in the CSV file: ${file.name}`);
              resolve({ isValid: false, error: `No data found in the CSV file: ${file.name}` });
              return;
            }

            // Get headers from first line
            const firstLine = lines[0] || '';
            const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

            if (headers.length === 0) {
              console.error(`No headers found in the CSV file: ${file.name}`);
              resolve({ isValid: false, error: `No headers found in the CSV file: ${file.name}` });
              return;
            }

            // Required headers for FileSelector
            const requiredHeaders = ['Source', 'Category', 'Sub Category'];

            // Check if all required headers exist in the file
            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

            if (missingHeaders.length > 0) {
              console.error(`File '${file.name}' is missing required columns: ${missingHeaders.join(', ')}`);
              resolve({ isValid: false, missingHeaders, error: `File '${file.name}' is missing required columns: ${missingHeaders.join(', ')}` });
            } else {
              resolve({ isValid: true });
            }
          } catch (error) {
            console.error('Error validating CSV file:', error);
            resolve({ isValid: false, error: `Failed to validate the CSV file: ${file.name}. Please ensure it is a valid CSV file.` });
          }
        };

        reader.onerror = () => {
          console.error(`Failed to read the CSV file: ${file.name}. Please try another file.`);
          reject(new Error(`Failed to read the CSV file: ${file.name}. Please try another file.`));
        };

        reader.readAsText(file);
      } else {
        // For Excel files, use ArrayBuffer reader
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;

            // Use ExcelJS to read Excel file
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            const worksheet = workbook.worksheets[0];
            if (!worksheet) {
              console.error(`No worksheets found in the Excel file: ${file.name}`);
              resolve({ isValid: false, error: `No worksheets found in the Excel file: ${file.name}` });
              return;
            }

            // Get headers from first row
            const firstRow = worksheet.getRow(1);
            const headers: string[] = [];
            firstRow.eachCell((cell) => {
              headers.push(String(cell.value || ''));
            });

            if (headers.length === 0) {
              console.error(`No data found in the Excel file: ${file.name}`);
              resolve({ isValid: false, error: `No data found in the Excel file: ${file.name}` });
              return;
            }

            // Required headers for FileSelector
            const requiredHeaders = ['Source', 'Category', 'Sub Category'];

            // Check if all required headers exist in the file
            const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

            if (missingHeaders.length > 0) {
              console.error(`File '${file.name}' is missing required columns: ${missingHeaders.join(', ')}`);
              resolve({ isValid: false, missingHeaders, error: `File '${file.name}' is missing required columns: ${missingHeaders.join(', ')}` });
            } else {
              resolve({ isValid: true });
            }
          } catch (error) {
            console.error('Error validating Excel file:', error);
            resolve({ isValid: false, error: `Failed to validate the Excel file: ${file.name}. Please ensure it is a valid Excel file.` });
          }
        };

        reader.onerror = () => {
          console.error(`Failed to read the Excel file: ${file.name}. Please try another file.`);
          reject(new Error(`Failed to read the Excel file: ${file.name}. Please try another file.`));
        };

        // Read file as ArrayBuffer for binary parsing
        reader.readAsArrayBuffer(file);
      }
    });
  };
  const { isAuthenticated, login } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const [checkingAuthorization, setCheckingAuthorization] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null); // null = not checked yet
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [lastUploadTime, setLastUploadTime] = useState<number>(0);
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

  const handleFileUpload = async (files: File[], userInfo?: { name: string; email: string; id: string }): Promise<{ data?: { rowCount?: number }, count?: number }> => {
    // Clear any previous messages
    setUploadMessage(null);

    // Validate all files before uploading
    for (const file of files) {
      const validationResult = await validateFileHeaders(file);
      if (!validationResult.isValid) {
        const errorMessage = validationResult.error || 'File validation failed';
        setUploadMessage({ message: errorMessage, type: 'error' });
        throw new Error(errorMessage);
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      // Append all files to the formData with the 'files' field name to match the backend
      files.forEach(file => {
        formData.append('files', file);
      });

      // Add user information if available
      if (userInfo) {
        formData.append('uploadedBy', JSON.stringify(userInfo));
      }

      // Check if authentication is enabled and get token if needed
      // Use the same logic as other parts of the application
      const authEnabled = process.env.AUTH_ENABLED === 'true' || process.env.VITE_AUTH_ENABLED === 'true';

      if (authEnabled) {
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
        totalFiles?: number;
        successfulUploads?: number;
        failedUploads?: number;
        totalRows?: number;
        rowCount?: number;
        validRows?: number;
        errorRows?: number;
        results?: Array<{
          success: boolean;
          importId?: string;
          fileName: string;
          totalRows?: number;
          validRows?: number;
          errorRows?: number;
          errors?: Array<{ row: number; error: string }>;
        }>;
        errors?: Array<{ fileName: string; error: string }>;
        // Axios wraps the response in a data property
        data?: {
          success: boolean;
          message: string;
          importId?: string;
          fileName?: string;
          totalFiles?: number;
          successfulUploads?: number;
          failedUploads?: number;
          totalRows?: number;
          rowCount?: number;
          validRows?: number;
          errorRows?: number;
          results?: Array<{
            success: boolean;
            importId?: string;
            fileName: string;
            totalRows?: number;
            validRows?: number;
            errorRows?: number;
            errors?: Array<{ row: number; error: string }>;
          }>;
          errors?: Array<{ fileName: string; error: string }>;
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

      // Calculate total rows processed
      let totalRowCount = 0;
      if (responseData.totalRows) {
        totalRowCount = responseData.totalRows;
      } else if (responseData.results) {
        totalRowCount = responseData.results.reduce((sum, result) => sum + (result.totalRows || 0), 0);
      }

      // Set appropriate message based on the response
      if (responseData.successfulUploads && responseData.failedUploads && responseData.failedUploads > 0) {
        // Partial success - some files were uploaded, some failed
        setUploadMessage({
          message: `Successfully processed ${responseData.successfulUploads} of ${responseData.totalFiles} files. ${responseData.failedUploads} failed.`,
          type: 'warning'
        });
        // Refresh file list even on partial success
        setLastUploadTime(Date.now());
      } else if (responseData.successfulUploads && responseData.successfulUploads > 0) {
        // All files were uploaded successfully
        let message = `${responseData.message || `Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`}`;
        if (totalRowCount) {
          message += `\nProcessed ${totalRowCount} rows total.`;
        }
        setUploadMessage({
          message: message,
          type: 'success'
        });
        // Trigger file list refresh
        setLastUploadTime(Date.now());
      } else {
        // No files were uploaded successfully
        setUploadMessage({
          message: 'No files were processed successfully',
          type: 'error'
        });
      }

      // Reset form
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);

      return { data: { rowCount: totalRowCount }, count: totalRowCount };
    } catch (error) {
      console.error('Upload error:', error);

      let errorMessage = 'Failed to upload files. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      // Show upload error if it's not a validation error (validation errors show their own toast)
      if (!errorMessage.includes('Missing required columns') &&
        !errorMessage.includes('No worksheets found') &&
        !errorMessage.includes('No data found') &&
        !errorMessage.includes('Failed to validate') &&
        !errorMessage.includes('Failed to read')) {
        setUploadMessage({ message: errorMessage, type: 'error' });
      }

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
          <h1 className="text-3xl font-bold mb-2">Edit Database</h1>
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
          <h1 className="text-3xl font-bold mb-2">Edit Database</h1>
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
          <h1 className="text-3xl font-bold mb-2">Edit Database</h1>
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
          <h1 className="text-3xl font-bold mb-2">Edit Database</h1>
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
          Edit Database
          <span className="ml-4 text-sm font-normal text-gray-500">

          </span>
        </h1>
        <p className="text-gray-600">
          Upload your Excel or CSV file to process and store the data in Cosmos DB.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="files">Delete Data Entry</TabsTrigger>
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
                {/* Display upload messages */}
                {uploadMessage && (
                  <div className={`mt-4 p-4 rounded-md ${uploadMessage.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
                    uploadMessage.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
                      uploadMessage.type === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
                        'bg-blue-100 border border-blue-400 text-blue-700'
                    }`}>
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        {uploadMessage.type === 'success' && (
                          <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {uploadMessage.type === 'error' && (
                          <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        {uploadMessage.type === 'warning' && (
                          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        {uploadMessage.type === 'info' && (
                          <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">
                            {uploadMessage.type === 'success' && 'Success'}
                            {uploadMessage.type === 'error' && 'Error'}
                            {uploadMessage.type === 'warning' && 'Warning'}
                            {uploadMessage.type === 'info' && 'Info'}
                          </span>: {uploadMessage.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-4 text-center">
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
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Required Columns: Source, Category, Sub Category</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <FileListTable refreshTrigger={lastUploadTime} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default UploadPage
