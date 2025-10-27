import type { Request } from 'express';
import type { ApiKey } from './apiKey.js';

// Extend the Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: Omit<ApiKey, 'keyHash'>;
      userId?: string;
      id?: string;
    }
  }
}