import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '../ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.js';

import { cn } from '../../lib/utils.js';
import { Upload, FileText, X } from 'lucide-react';

type FileUploadProps = {
  onUpload: (file: File) => Promise<void>;
  accept?: string[];
  maxSize?: number;
  className?: string;
  progress?: number;
  isUploading?: boolean;
};

export function FileUpload({
  onUpload,
  accept = ['.xlsx', '.xls', '.csv'],
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  progress = 0,
  isUploading = false,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localIsUploading, setLocalIsUploading] = useState(false);
  
  const isUploadingLocal = isUploading !== undefined ? isUploading : localIsUploading;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
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
    },
    [accept, maxSize]
  );

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
    if (!file) return;
    
    try {
      setLocalIsUploading(true);
      setError(null);
      await onUpload(file);
      // Reset after successful upload
      setFile(null);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setLocalIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle>Upload Excel/CSV File</CardTitle>
        <CardDescription>
          Upload your Excel or CSV file to process and store the data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50',
            className
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragActive ? 'Drop the file here' : 'Drag and drop your file here'}
              </p>
              <p className="text-xs text-muted-foreground">
                {`Supports: ${accept.join(', ')} (Max: ${maxSize / (1024 * 1024)}MB)`}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Select File
            </Button>
          </div>
        </div>

        {file && (
          <div className="mt-4 p-4 border rounded-lg bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <div className="w-full space-y-2">
            <Button
              type="button"
              onClick={handleUpload}
              disabled={!file || isUploadingLocal}
              className="w-full sm:w-auto"
            >
              {isUploadingLocal ? 'Uploading...' : 'Upload File'}
            </Button>
            {isUploadingLocal && progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            {isUploadingLocal && (progress || 0) > 0 && (
              <p className="text-xs text-muted-foreground text-right">
                {progress}% uploaded
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
