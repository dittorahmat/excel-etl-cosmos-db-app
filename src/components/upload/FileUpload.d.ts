type FileUploadProps = {
    /** Callback function when files are uploaded */
    onUpload: (files: File[]) => Promise<{
        data?: {
            rowCount?: number;
        };
        count?: number;
    }>;
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
export declare function FileUpload({ onUpload, accept, maxSize, // 10MB
className, progress, isUploading, }: FileUploadProps): JSX.Element;
export {};
