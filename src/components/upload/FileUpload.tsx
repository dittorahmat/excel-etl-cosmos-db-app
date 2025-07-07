import { useState, useCallback, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Button } from '../ui/button';
import { Upload as UploadIcon, FileText, X } from 'lucide-react';

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
  onUpload: (file: File) => Promise<{ data?: { rowCount?: number }, count?: number }>;
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
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError(null);
      
      if (fileRejections.length > 0) {
        const { errors } = fileRejections[0];
        const errorMessage = errors[0].code === 'file-too-large' 
          ? `File is too large. Max size is ${maxSize / 1024 / 1024}MB`
          : errors[0].message;
        setError(errorMessage);
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        // Ensure the file has the correct MIME type based on its extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension && MIME_TYPES[`.${extension}` as keyof typeof MIME_TYPES]) {
          // Create a new File object with the correct MIME type
          const mimeType = MIME_TYPES[`.${extension}` as keyof typeof MIME_TYPES];
          const newFile = new File([file], file.name, { 
            type: mimeType,
            lastModified: file.lastModified
          });
          setFile(newFile);
        } else {
          setFile(file);
        }
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
    multiple: false,
    disabled: isUploading || isUploadingLocal
  });

  const handleUpload = async () => {
    if (!file) return;
    
    try {
      setIsUploadingLocal(true);
      await onUpload(file);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploadingLocal(false);
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
        isUploading: isUploading || isUploadingLocal,
        progress,
        error
      });
    }
  }, [file, isUploading, isUploadingLocal, progress, error]);

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center p-6 border-2 border-dashed rounded-lg transition-colors ${
        isDragActive ? 'bg-muted/50' : 'bg-background'
      } ${
        error ? 'border-destructive' : 'border-border'
      } ${isUploading || isUploadingLocal ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <input {...getInputProps()} />
      
      {isUploading || isUploadingLocal ? (
        <div className="w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Uploading... {Math.round(progress)}%
          </p>
          <Progress value={progress} className="mt-4 h-2" />
        </div>
      ) : file ? (
        <div className="flex items-center w-full">
          <FileText className="h-6 w-6 mr-3 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={isUploading || isUploadingLocal}
              className="px-3 py-1 h-8 text-xs"
            >
              {isUploading || isUploadingLocal ? 'Uploading...' : 'Upload'}
            </Button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
              disabled={isUploading || isUploadingLocal}
              className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <UploadIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <h4 className="font-medium">
            {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            or click to select a file
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supported formats: {accept.join(', ')} (max {maxSize / 1024 / 1024}MB)
          </p>
        </div>
      )}
      

      
      {error && (
        <p className="text-sm text-destructive mt-2 text-center">
          {error}
        </p>
      )}
    </div>
  );
}

export default FileUpload;
