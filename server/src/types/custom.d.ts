import { Request } from 'express';
import { Container } from '@azure/cosmos';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: {
        oid?: string;
        [key: string]: any;
      };
    }
  }
}

export interface AzureCosmosDB {
  database: {
    container(containerId: string): Container;
  };
}

export interface AuthenticatedRequest extends Request {
  user: {
    oid: string;
    [key: string]: any;
  };
}

export interface MulterError extends Error {
  code?: string;
  field?: string;
}

export interface FileTypeError extends Error {
  message: string;
  code?: string;
}
