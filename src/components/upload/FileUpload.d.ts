type FileUploadProps = {
    onUpload: (file: File) => Promise<void>;
    accept?: string[];
    maxSize?: number;
    className?: string;
    progress?: number;
    isUploading?: boolean;
};
export declare function FileUpload({ onUpload, accept, maxSize, // 10MB
className, progress, isUploading, }: FileUploadProps): import("react/jsx-runtime").JSX.Element;
export {};
