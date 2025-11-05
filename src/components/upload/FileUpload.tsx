import { useState, useCallback, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Button } from '../ui/button';
import { Upload as UploadIcon, FileText, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface ProgressProps {
  value: number;
  className?: string;
}

const Progress = ({ value, className = '' }: ProgressProps) => (
  <div className={`h-2 w-full bg-muted rounded-full overflow-hidden ${className}`}>
    <div 
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

type FileUploadProps = {
  /** Callback function when a file is uploaded */
  onUpload: (files: File[], userInfo?: { name: string; email: string; id: string }) => Promise<{ data?: { rowCount?: number }, count?: number }>;
  /** Array of accepted file types (e.g., ['.xlsx', '.csv']) */
  accept?: string[];
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Additional CSS class name */
  className?: string;
  /** Upload progress (0-100) */
  progress?: number;
  /** Whether the file is currently being uploaded */
  isUploading?: boolean;
};

const MIME_TYPES = {
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.csv': 'text/csv',
} as const;

export function FileUpload({
  onUpload,
  accept = ['.xlsx', '.xls', '.csv'],
  maxSize = 10 * 1024 * 1024, // 10MB
  className = '',
  progress = 0,
  isUploading = false,
}: FileUploadProps): JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError(null);
      
      if (acceptedFiles.length > 0) {
        const newFiles = acceptedFiles.map(file => {
          const extension = `.${file.name.split('.').pop()?.toLowerCase()}`;
          if (extension && MIME_TYPES[extension as keyof typeof MIME_TYPES]) {
            // Create a new File object with the correct MIME type
            const mimeType = MIME_TYPES[extension as keyof typeof MIME_TYPES];
            return new File([file], file.name, { 
              type: mimeType,
              lastModified: file.lastModified
            });
          } else {
            return file;
          }
        });
        setFiles(prevFiles => [...prevFiles, ...newFiles]); // Add new files to existing files
      } else if (fileRejections.length > 0) {
        const { errors } = fileRejections[0];
        let errorMessage = errors[0].message;
        if (errors[0].code === 'file-too-large') {
          errorMessage = `File is too large. Max size is ${maxSize / 1024 / 1024}MB`;
        }
        setError(errorMessage);
        return;
      }
    },
    [maxSize]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, ext) => {
      const mimeType = MIME_TYPES[ext as keyof typeof MIME_TYPES];
      if (mimeType) {
        return { ...acc, [mimeType]: [] };
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxSize,
    multiple: true, // Enable multiple file selection
    disabled: isUploading
  });

  const getUserInfo = useCallback(() => {
    if (!isAuthenticated || !user) {
      return undefined;
    }

    return {
      name: user.name || 'Unknown User',
      email: user.username || 'unknown@example.com',
      id: user.localAccountId || user.homeAccountId || 'anonymous'
    };
  }, [user, isAuthenticated]);

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    try {
      const userInfo = getUserInfo();
      await onUpload(files, userInfo);
      setFiles([]); // Clear the files after successful upload
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload files');
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setError(null);
  };

  // Log component state changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('FileUpload state:', { 
        fileCount: files.length,
        isUploading: isUploading,
        progress,
        error
      });
    }
  }, [files, isUploading, progress, error]);

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center p-6 border-2 border-dashed rounded-lg transition-colors ${
        isDragActive ? 'bg-muted/50' : 'bg-background'
      } ${
        error ? 'border-destructive' : 'border-border'
      } ${isUploading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <input {...getInputProps()} data-testid="file-upload-input" />
      
      {isUploading ? (
        <div className="w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Uploading... {Math.round(progress)}%
          </p>
          <Progress value={progress} className="mt-4 h-2" />
        </div>
      ) : files.length > 0 ? (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Selected Files ({files.length})</h4>
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={isUploading}
              className="px-3 py-1 h-8 text-xs"
            >
              {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div key={index} className="flex items-center w-full p-2 border rounded">
                <FileText className="h-5 w-5 mr-2 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  disabled={isUploading}
                  className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground ml-2"
                  data-testid="remove-file-button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {isAuthenticated && user && (
            <p className="text-xs text-muted-foreground mt-2">
              Will be uploaded by: {user.name || user.username || 'Current User'}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center">
          <UploadIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <h4 className="font-medium">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            or click to select files
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supported formats: {accept.join(', ')} (max {maxSize / 1024 / 1024}MB)
          </p>
          {isAuthenticated && user && (
            <p className="text-xs text-muted-foreground mt-2">
              Will be uploaded by: {user.name || user.username || 'Current User'}
            </p>
          )}
        </div>
      )}
      

      
      {error && (
        <p className="text-sm text-destructive mt-2 text-center" data-testid="error-message">
          {error}
        </p>
      )}
    </div>
  );
}


