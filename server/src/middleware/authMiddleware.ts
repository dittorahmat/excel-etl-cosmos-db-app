import { Request, Response, NextFunction } from 'express';
import { ApiKeyRepository } from '../repositories/apiKeyRepository.js';
import { ApiKeyUsageRepository } from '../repositories/apiKeyUsageRepository.js';
import { logger } from '../utils/logger.js';

// Define the API key interface
export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  isActive: boolean;
  lastUsedAt?: string;
  lastUsedFromIp?: string;
  createdAt: string;
  expiresAt?: string;
  allowedIps?: string[];
  description?: string;
}

export interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: string;
    userId: string;
    name: string;
    isActive: boolean;
    lastUsedAt?: string;
    lastUsedFromIp?: string;
    createdAt: string;
    expiresAt?: string;
  };
  startTime?: [number, number];
  user?: {
    oid: string;
    roles?: string[];
    [key: string]: any;
  };
}

/**
 * Middleware to require API key authentication
 * @param cosmosDb Azure Cosmos DB instance
 * @returns Express middleware function
 */
interface AuthMiddlewareDependencies {
  apiKeyRepository: ApiKeyRepository;
  apiKeyUsageRepository: ApiKeyUsageRepository;
}

interface AuthDependencies {
  apiKeyRepository: ApiKeyRepository;
  apiKeyUsageRepository: ApiKeyUsageRepository;
}

export function requireAuth(deps: AuthDependencies) {
  const { apiKeyRepository, apiKeyUsageRepository } = deps;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = process.hrtime();
    req.startTime = startTime;
    
    const requestId = res.getHeader('X-Request-ID') as string || 'unknown';
    const requestInfo = {
      requestId,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };
    
    try {
      // Check for API key in headers or query params
      const apiKey = req.headers['x-api-key'] || req.query.api_key;
      
      if (!apiKey) {
        logger.warn('API key is required', {
          ...requestInfo,
          error: 'API_KEY_MISSING',
        });
        
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'API key is required',
          requestId,
        });
      }

      // Validate API key
      const validation = await apiKeyRepository.validateApiKey({
        key: String(apiKey),
        userId: req.user?.oid,
        ipAddress: req.ip,
      });

      if (!validation.isValid || !validation.key) {
        logger.warn('Invalid or expired API key', {
          ...requestInfo,
          error: 'API_KEY_INVALID',
          apiKeyId: validation.key?.id || 'unknown',
        });
        
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Invalid or expired API key',
          requestId,
        });
      }

      // Update last used timestamp
      try {
        await apiKeyRepository.updateLastUsed(validation.key.id, req.ip);
      } catch (updateError) {
        // Log the error but don't fail the request
        errorLogger(updateError as Error, {
          ...requestInfo,
          context: 'updateLastUsed',
          apiKeyId: validation.key.id,
        });
      }

      // Attach API key info to request for use in route handlers
      req.apiKey = validation.key;
      
      // Log successful authentication
      logger.info('API key authenticated', {
        ...requestInfo,
        apiKeyId: validation.key.id,
        userId: validation.key.userId,
      });
      
      // Record API key usage after the response is sent
      res.on('finish', async () => {
        try {
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const responseTimeMs = (seconds * 1000) + (nanoseconds / 1e6);
          
          await apiKeyUsageRepository.recordUsage({
            apiKeyId: validation.key!.id,
            userId: validation.key!.userId,
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent') || '',
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            responseTime: responseTimeMs,
            requestId: requestId,
            metadata: {
              query: req.query,
              params: req.params,
              // Don't log full body as it might contain sensitive data
              body: req.body ? { ...req.body, password: undefined, token: undefined } : undefined,
            },
          });
        } catch (error) {
          logger.error('Error recording API key usage', {
            ...requestInfo,
            context: 'recordUsage',
            apiKeyId: validation.key!.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
      
      next();
    } catch (error) {
      logger.error('Error in requireAuth', {
        ...requestInfo,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Don't leak internal errors to the client
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to validate API key',
        requestId,
      });
    }
  };
}

/**
 * Middleware to check if the authenticated user has a specific role
 * @param roles Array of allowed roles
 * @returns Express middleware function
 */
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    
    const userRoles = req.user.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }
    
    next();
  };
}

/**
 * Middleware to require either API key or Azure AD authentication
 */
export const requireAuthOrApiKey = (deps: AuthDependencies) => {
  const apiKeyAuth = requireAuth(deps);
  
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // If user is already authenticated via Azure AD, continue
      if (req.user) {
        return next();
      }
      
      // Otherwise, try API key authentication
      return await apiKeyAuth(req, res, next);
    } catch (error) {
      logger.error('Error in requireAuthOrApiKey', { 
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      next(error);
    }
  };
};
