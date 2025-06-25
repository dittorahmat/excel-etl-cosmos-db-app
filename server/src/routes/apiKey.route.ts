import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { body, param } from 'express-validator';

import { ApiKeyRepository } from '../repositories/apiKeyRepository.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

import type { AzureCosmosDB } from '../types/azure.js';
import type { CreateApiKeyRequest, RevokeApiKeyParams } from '../types/apiKey.js';
import type { AuthenticatedRequest } from '../types/custom.js';

// Helper type to properly type async request handlers
type AsyncRequestHandler<P = {}, ResBody = any, ReqBody = any, ReqQuery = any> = (
  req: Request<P, ResBody, ReqBody, ReqQuery> & { user?: any },
  res: Response<ResBody>,
  next: NextFunction
) => Promise<void>;

export function createApiKeyRouter(cosmosDb: AzureCosmosDB) {
  const router = Router();
  const apiKeyRepository = new ApiKeyRepository(cosmosDb);

  // Apply authentication and rate limiting to all routes
  router.use(authenticateToken);
  
  // Apply rate limiting to all API key routes
  router.use(authRateLimiter);

  // Middleware to ensure user is authenticated
  const requireAuth = (): RequestHandler => {
    return (req, res, next) => {
      const authReq = req as AuthenticatedRequest;
      if (!authReq.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }
      next();
    };
  };

  /**
   * @route   POST /api/keys
   * @desc    Create a new API key
   * @access  Private
   */
  // Create API key route
  const createApiKeyHandler: AsyncRequestHandler<{}, any, CreateApiKeyRequest> = async (req, res, next) => {
    try {
      const userId = req.user?.oid;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User ID not found',
        });
        return;
      }

      const { name, expiresAt, allowedIps } = req.body;
      
      // Check if user has reached the maximum number of API keys
      const { keys } = await apiKeyRepository.listApiKeys(userId);
      const maxKeys = parseInt(process.env.API_KEY_MAX_KEYS_PER_USER || '10', 10);
      
      if (keys.length >= maxKeys) {
        throw new Error(`You have reached the maximum number of API keys (${maxKeys}). Please revoke unused keys before creating new ones.`);
      }
      
      const apiKey = await apiKeyRepository.createApiKey(userId, {
        name,
        expiresAt,
        allowedIps,
      });

      res.status(201).json({
        success: true,
        data: apiKey,
      });
    } catch (error) {
      next(error);
    }
  };

  router.post(
    '/',
    [
      body('name').isString().trim().notEmpty().withMessage('Name is required'),
      body('expiresAt').optional().isISO8601().toDate(),
      body('allowedIps').optional().isArray(),
      body('allowedIps.*').isIP().withMessage('Invalid IP address'),
      validateRequest,
    ],
    createApiKeyHandler
  );

  /**
   * @route   GET /api/keys
   * @desc    Get all API keys for the authenticated user
   * @access  Private
   */
  // List API keys route
  const listApiKeysHandler: AsyncRequestHandler = async (req, res, next) => {
    try {
      const userId = req.user?.oid;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User ID not found',
        });
        return;
      }

      const { keys } = await apiKeyRepository.listApiKeys(userId);
      
      res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error) {
      next(error);
    }
  };

  router.get('/', listApiKeysHandler as unknown as RequestHandler);

  /**
   * @route   DELETE /api/keys/:keyId
   * @desc    Revoke an API key
   * @access  Private
   */
  // Revoke API key route
  const revokeApiKeyHandler: AsyncRequestHandler<RevokeApiKeyParams> = async (req, res, next) => {
    try {
      const userId = req.user?.oid;
      const { keyId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User ID not found',
        });
        return;
      }

      if (!keyId) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'API key ID is required',
        });
        return;
      }

      const success = await apiKeyRepository.revokeApiKey({
        keyId,
        userId,
      });

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'API key not found or already revoked',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  router.delete(
    '/:keyId',
    [
      param('keyId').isString().notEmpty().withMessage('Key ID is required'),
      validateRequest as unknown as RequestHandler,
    ],
    revokeApiKeyHandler as unknown as RequestHandler
  );

  return router;

  return router;
}
