import type { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../types/apiKey.js';
import { ApiKeyRepository } from '../repositories/apiKeyRepository.js';
import { apiKeyRateLimiter } from '../services/rate-limit/api-key-rate-limiter.js';
import { auditLogService } from '../services/audit/audit-log.service.js';
import { logger } from '../utils/logger.js';

// Get client IP address from request
const getClientIp = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  if (forwardedFor && typeof forwardedFor === 'string') {
    const forwardedString = forwardedFor as string;
    const parts = forwardedString.split(',');
    return parts.length > 0 && parts[0] ? parts[0].trim() : 'unknown';
  }
  
  if (realIp && typeof realIp === 'string') {
    return realIp;
  }
  
  return req.socket?.remoteAddress || 'unknown';
};

// Get user agent from request
const getUserAgent = (req: Request): string => {
  const userAgent = req.headers['user-agent'];
  return userAgent && typeof userAgent === 'string' ? userAgent : 'unknown';
};

/**
 * Enhanced API key authentication middleware
 */
export const enhancedApiKeyAuth = (apiKeyRepository: ApiKeyRepository) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract API key from Authorization header
      const authHeader = req.headers.authorization;
      const apiKey = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;

      if (!apiKey) {
        // Log failed API key attempt
        await auditLogService.logApiKeyEvent({
          userId: 'unknown',
          action: 'failed_use',
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
          details: { reason: 'No API key provided' }
        }).catch(err => logger.error('Failed to log API key event', { error: err }));

        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'API key is required'
        });
        return;
      }

      // Get client IP for IP restriction checking
      const clientIp = getClientIp(req);

      // Validate API key
      const validationResult = await apiKeyRepository.validateApiKey({
        key: apiKey,
        ipAddress: clientIp
      });

      if (!validationResult.isValid) {
        // Log failed API key attempt
        await auditLogService.logApiKeyEvent({
          userId: 'unknown',
          action: 'failed_use',
          ipAddress: clientIp,
          userAgent: getUserAgent(req),
          details: { reason: validationResult.error }
        }).catch(err => logger.error('Failed to log API key event', { error: err }));

        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: validationResult.error || 'Invalid API key'
        });
        return;
      }

      // Get the API key details
      const keyDetails = validationResult.key as Omit<ApiKey, 'keyHash'> | undefined;
      if (!keyDetails) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
        return;
      }

      // Check rate limiting
      const rateLimitResult = await apiKeyRateLimiter.isRateLimited(keyDetails.id as string);
      
      // Add rate limit headers to response
      const rateLimitHeaders = apiKeyRateLimiter.getRateLimitHeaders(keyDetails.id as string);
      for (const [key, value] of Object.entries(rateLimitHeaders)) {
        res.setHeader(key, value);
      }

      // If rate limited, return 429
      if (rateLimitResult.isLimited) {
        // Log rate limit event
        await auditLogService.logApiKeyEvent({
          userId: keyDetails.userId as string,
          action: 'failed_use',
          apiKeyId: keyDetails.id as string,
          ipAddress: clientIp,
          userAgent: getUserAgent(req),
          details: { reason: 'Rate limited' }
        }).catch(err => logger.error('Failed to log API key event', { error: err }));

        res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)
        });
        return;
      }

      // Attach API key info to request
      req.apiKey = keyDetails;
      req.userId = keyDetails.userId as string;

      // Log successful API key use
      await auditLogService.logApiKeyEvent({
        userId: keyDetails.userId as string,
        action: 'use',
        apiKeyId: keyDetails.id as string,
        ipAddress: clientIp,
        userAgent: getUserAgent(req)
      }).catch(err => logger.error('Failed to log API key event', { error: err }));

      next();
      return; // Add explicit return
    } catch (error) {
      logger.error('API key authentication error:', error);
      
      // Log failed API key attempt
      await auditLogService.logApiKeyEvent({
        userId: 'unknown',
        action: 'failed_use',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: { reason: 'Server error', error: (error as Error).message }
      }).catch(err => logger.error('Failed to log API key event', { error: err }));

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Authentication failed'
      });
      return;
    }
  };
};