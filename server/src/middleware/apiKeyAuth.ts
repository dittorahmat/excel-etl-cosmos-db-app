import type { Request, Response, NextFunction } from 'express';
import type { AzureCosmosDB } from '../types/azure.js';
import type { TokenPayload } from './auth.js';
import { ApiKeyRepository } from '../repositories/apiKeyRepository.js';

// Enable debug logging in test environment
const isTest = process.env.NODE_ENV === 'test';
const debug = isTest ? console.log : () => {};

declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        userId: string;
        name: string;
      };
    }
  }
}

/**
 * Creates an error object with status and message
 */
function createError(status: number, message: string, originalError?: Error) {
  const error = new Error(message) as any;
  error.status = status;
  if (originalError) {
    error.originalError = originalError;
  }
  return error;
}

/**
 * Middleware to validate API key authentication
 * This should be used in conjunction with the Azure AD authentication middleware
 * to support both authentication methods.
 * @param cosmosDb Azure CosmosDB instance or ApiKeyRepository
 * @param apiKeyRepository Optional ApiKeyRepository instance (for testing)
 */
export function apiKeyAuth(
  cosmosDb: AzureCosmosDB | ApiKeyRepository,
  apiKeyRepository?: ApiKeyRepository
) {
  debug('[apiKeyAuth] Creating new middleware instance');
  
  // Initialize repository
  let repository: ApiKeyRepository;
  try {
    repository = apiKeyRepository || 
      (cosmosDb instanceof ApiKeyRepository ? cosmosDb : new ApiKeyRepository(cosmosDb as AzureCosmosDB));
  } catch (error) {
    console.error('Failed to initialize ApiKeyRepository:', error);
    throw new Error('Failed to initialize API key validation service');
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    debug('[apiKeyAuth] Handling request', { 
      method: req.method, 
      path: req.path,
      hasUser: !!req.user,
      headers: Object.keys(req.headers)
    });

    // Skip API key validation if user is already authenticated with Azure AD
    if (req.user) {
      debug('[apiKeyAuth] User already authenticated, skipping API key validation');
      return next();
    }

    // Check for API key in Authorization header (preferred) or query parameter
    const authHeader = req.headers.authorization || '';
    let apiKey: string | undefined;

    debug('[apiKeyAuth] Checking for API key', { 
      hasAuthHeader: !!authHeader,
      queryParams: Object.keys(req.query)
    });
    
    // Try to get API key from Authorization header (format: "ApiKey <key>" or "apikey <key>")
    const apiKeyMatch = authHeader.match(/^(?:apikey|ApiKey)\s+(.+)$/i);
    if (apiKeyMatch) {
      apiKey = apiKeyMatch[1];
      debug('[apiKeyAuth] Found API key in Authorization header');
    }
    // Fall back to query parameter
    else if (typeof req.query.api_key === 'string') {
      apiKey = req.query.api_key;
      debug('[apiKeyAuth] Found API key in query parameter');
    }

    if (!apiKey) {
      const error = createError(401, 'API key is required');
      debug('[apiKeyAuth] No API key provided');
      return next(error);
    }

    try {
      debug('[apiKeyAuth] Validating API key', { 
        key: apiKey.substring(0, 5) + '...', // Don't log full key
        ipAddress: req.ip || 'unknown'
      });

      // Validate the API key
      debug('[apiKeyAuth] Calling validateApiKey with:', { 
        keyPrefix: apiKey.substring(0, 5) + '...',
        ipAddress: req.ip || 'unknown'
      });
      
      const validationResult = await repository.validateApiKey({
        key: apiKey,
        ipAddress: req.ip || 'unknown',
      });

      debug('[apiKeyAuth] validateApiKey result:', { 
        isValid: validationResult.isValid,
        keyId: validationResult.key?.id,
        keyName: validationResult.key?.name,
        error: validationResult.error,
        keyPresent: !!validationResult.key,
        fullResult: JSON.stringify(validationResult, null, 2)
      });

      if (!validationResult.isValid || !validationResult.key) {
        // Use the validation error message if available, otherwise fall back to a generic message
        const errorMessage = validationResult.error || 'Invalid API key';
        debug('[apiKeyAuth] API key validation failed', { 
          keyPrefix: apiKey.substring(0, 5) + '...',
          error: errorMessage,
          validationResult: {
            isValid: validationResult.isValid,
            keyPresent: !!validationResult.key,
            error: validationResult.error
          }
        });
        const error = createError(401, errorMessage);
        return next(error);
      }

      // Attach API key info to the request for use in route handlers
      req.apiKey = {
        id: String(validationResult.key.id),
        userId: String(validationResult.key.userId),
        name: String(validationResult.key.name),
      };
      
      debug('[apiKeyAuth] API key attached to request:', {
        apiKeyId: req.apiKey.id,
        userId: req.apiKey.userId,
        name: req.apiKey.name
      });

      debug('[apiKeyAuth] API key validated successfully', { 
        apiKeyId: req.apiKey.id,
        apiKeyName: req.apiKey.name
      });

      next();
    } catch (error) {
      const errorMsg = 'API key validation error';
      console.error(errorMsg, error);
      const err = createError(500, 'Failed to validate API key', error as Error);
      next(err);
    }
  };
}

/**
 * Middleware to require either API key or Azure AD authentication
 */
export function requireAuthOrApiKey(cosmosDb: AzureCosmosDB) {
  const authMiddleware = apiKeyAuth(cosmosDb);

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      console.info('[requireAuthOrApiKey] Azure AD user detected, skipping API key validation', { user: req.user });
      return next();
    }
    console.info('[requireAuthOrApiKey] No Azure AD user, attempting API key authentication');
    return authMiddleware(req, res, next);
  };
}

