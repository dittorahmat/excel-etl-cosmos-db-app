import { Request, Response, NextFunction } from 'express';

// Define the types locally to avoid import issues
export interface ApiKey {
  id: string;
  name: string;
  userId: string;
  keyHash: string;
  key?: string; // Add key property for testing
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
  [key: string]: any; // Allow additional properties for flexibility
}

// Define the API key validation types
export interface ValidateApiKeyParams {
  key: string;
  ipAddress?: string;
}

export interface ValidateApiKeyResult {
  isValid: boolean;
  key: ApiKey | null;
  error?: string;
}

// Extended Request type for testing
export interface TestRequest extends Request {
  user?: any;
  apiKey?: any;
  ip: string; // Make ip required to match Express Request type
}

export type ApiKeyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => void;
