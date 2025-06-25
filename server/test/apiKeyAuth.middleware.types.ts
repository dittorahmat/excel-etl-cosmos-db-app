import type { Request, Response, NextFunction } from 'express';

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  createdBy: string;
  updatedBy: string;
  allowedIps?: string[];
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  key: ApiKey | null;
  error?: string;
}

export interface ApiKeyRepository {
  validateApiKey(params: { key: string; ipAddress?: string }): Promise<ApiKeyValidationResult>;
}

export interface TestRequest extends Request {
  user?: any;
  apiKey?: {
    id: string;
    userId: string;
    name: string;
  };
  ip: string;
  headers: {
    [key: string]: string | string[] | undefined;
    authorization?: string;
  };
  authorization?: string;
}

export interface ValidationResult {
  err?: Error;
  apiKey?: any;
}
