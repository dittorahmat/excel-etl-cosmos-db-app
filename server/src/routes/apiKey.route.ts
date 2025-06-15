import { Router } from 'express';
import { AzureCosmosDB } from '../config/azure';
import { ApiKeyRepository } from '../repositories/apiKeyRepository';
import { CreateApiKeyRequest, RevokeApiKeyParams } from '../types/apiKey';
import { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateToken } from '../middleware/auth';
import { authRateLimiter, defaultRateLimiter } from '../middleware/rateLimit';

export function createApiKeyRouter(cosmosDb: AzureCosmosDB) {
  const router = Router();
  const apiKeyRepository = new ApiKeyRepository(cosmosDb);

  // Apply authentication and rate limiting to all routes
  router.use(authenticateToken);
  
  // Apply stricter rate limiting to API key routes
  router.use(authRateLimiter);

  // Middleware to ensure user is authenticated
  const requireAuth = (req: Request, res: Response, next: () => void) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }
    next();
  };

  /**
   * @route   POST /api/keys
   * @desc    Create a new API key
   * @access  Private
   */
  router.post(
    '/',
    [
      body('name').isString().trim().notEmpty().withMessage('Name is required'),
      body('expiresAt').optional().isISO8601().toDate(),
      body('allowedIps').optional().isArray(),
      body('allowedIps.*').isIP().withMessage('Invalid IP address'),
      validateRequest,
    ],
    async (req: Request<{}, {}, CreateApiKeyRequest>, res: Response) => {
      try {
        const userId = req.user?.oid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found',
          });
        }

        const { name, expiresAt, allowedIps } = req.body;
        
        // Check if user has reached the maximum number of API keys
        const { keys } = await apiKeyRepository.listApiKeys(userId);
        const maxKeys = parseInt(process.env.API_KEY_MAX_KEYS_PER_USER || '10', 10);
        
        if (keys.length >= maxKeys) {
          return res.status(400).json({
            success: false,
            error: 'Maximum API keys reached',
            message: `You have reached the maximum number of API keys (${maxKeys}). Please revoke unused keys before creating new ones.`,
          });
        }
        
        const apiKey = await apiKeyRepository.createApiKey(userId, {
          name,
          expiresAt,
          allowedIps,
        });

        return res.status(201).json({
          success: true,
          data: apiKey,
        });
      } catch (error) {
        console.error('Error creating API key:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to create API key',
        });
      }
    }
  );

  /**
   * @route   GET /api/keys
   * @desc    Get all API keys for the authenticated user
   * @access  Private
   */
  router.get('/', defaultRateLimiter, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.oid;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'User ID not found',
        });
      }

      const { keys } = await apiKeyRepository.listApiKeys(userId);
      
      return res.status(200).json({
        success: true,
        data: keys,
      });
    } catch (error) {
      console.error('Error listing API keys:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to list API keys',
      });
    }
  });

  /**
   * @route   DELETE /api/keys/:keyId
   * @desc    Revoke an API key
   * @access  Private
   */
  router.delete(
    '/:keyId',
    [
      param('keyId').isString().notEmpty().withMessage('Key ID is required'),
      validateRequest,
      defaultRateLimiter,
    ],
    async (req: Request<{ keyId: string }>, res: Response) => {
      try {
        const userId = req.user?.oid;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized',
            message: 'User ID not found',
          });
        }

        const { keyId } = req.params;
        if (!keyId) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'API key ID is required',
          });
        }

        const success = await apiKeyRepository.revokeApiKey({
          keyId,
          userId,
        });

        if (!success) {
          return res.status(404).json({
            success: false,
            error: 'Not Found',
            message: 'API key not found or already revoked',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'API key revoked successfully',
        });
      } catch (error) {
        console.error('Error revoking API key:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to revoke API key',
        });
      }
    }
  );
  });

  return router;
}
