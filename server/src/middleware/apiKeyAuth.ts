import { Request, Response, NextFunction } from 'express';
import { ApiKeyRepository } from '../repositories/apiKeyRepository.js';
import { AzureCosmosDB } from '../config/azure.js';
import { TokenPayload } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        name: string;
      };
    }
  }
}

/**
 * Middleware to validate API key authentication
 * This should be used in conjunction with the Azure AD authentication middleware
 * to support both authentication methods.
 */
export function apiKeyAuth(cosmosDb: AzureCosmosDB) {
  const apiKeyRepository = new ApiKeyRepository(cosmosDb);

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip API key validation if user is already authenticated with Azure AD
    if (req.user) {
      return next();
    }

    // Check for API key in Authorization header (preferred) or query parameter
    const authHeader = req.headers.authorization || '';
    let apiKey: string | undefined;

    // Try to get API key from Authorization header (format: "ApiKey <key>")
    if (authHeader.startsWith('ApiKey ')) {
      apiKey = authHeader.split(' ')[1];
    }
    // Fall back to query parameter
    else if (typeof req.query.api_key === 'string') {
      apiKey = req.query.api_key;
    }

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'API key is required',
      });
    }

    try {
      // Get user ID from the request (this should be set by a previous middleware)
      const userId = (req.user as any)?.oid;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User context is required for API key validation',
        });
      }

      // Validate the API key
      const { isValid, key } = await apiKeyRepository.validateApiKey({
        key: apiKey,
        userId,
        ipAddress: req.ip,
      });

      if (!isValid || !key) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Invalid or expired API key',
        });
      }

      // Attach API key info to the request for use in route handlers
      req.apiKey = {
        id: key.id,
        name: key.name,
      };

      next();
    } catch (error) {
      console.error('API key validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to validate API key',
      });
    }
  };
}

/**
 * Middleware to require either API key or Azure AD authentication
 */
export function requireAuthOrApiKey(cosmosDb: AzureCosmosDB) {
  const authMiddleware = apiKeyAuth(cosmosDb);
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // If user is already authenticated with Azure AD, continue
    if (req.user) {
      return next();
    }
    
    // Otherwise, try API key authentication
    return authMiddleware(req, res, next);
  };
}
