declare module 'multer' {
  import { Request, Response, NextFunction } from 'express';

  export interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  export class MulterError extends Error {
    constructor(code: string, field?: string);
    code: string;
    field?: string;
  }

  export interface Options {
    dest?: string;
    storage?: StorageEngine;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    fileFilter?(req: Request, file: File, callback: (error: Error | null, acceptFile: boolean) => void): void;
  }

  export interface StorageEngine {
    _handleFile(req: Request, file: File, callback: (error?: any, info?: Partial<File>) => void): void;
    _removeFile(req: Request, file: File, callback: (error: Error | null) => void): void;
  }

  export interface DiskStorageOptions {
    destination?: string | ((
      req: Request,
      file: File,
      callback: (error: Error | null, destination: string) => void
    ) => void);
    filename?(
      req: Request,
      file: File,
      callback: (error: Error | null, filename: string) => void
    ): void;
  }

  export function diskStorage(options: DiskStorageOptions): StorageEngine;

  export interface Multer {
    single(fieldName: string): (req: Request, res: Response, next: NextFunction) => void;
    array(fieldName: string, maxCount?: number): (req: Request, res: Response, next: NextFunction) => void;
    fields(fields: Array<{ name: string; maxCount?: number }>): (req: Request, res: Response, next: NextFunction) => void;
    none(): (req: Request, res: Response, next: NextFunction) => void;
    any(): (req: Request, res: Response, next: NextFunction) => void;
  }

  export interface MulterStatic {
    (options?: Options): Multer;
    diskStorage(options: DiskStorageOptions): StorageEngine;
    memoryStorage(): StorageEngine;
    MulterError: typeof MulterError;
  }

  const multer: MulterStatic;
  export default multer;
}