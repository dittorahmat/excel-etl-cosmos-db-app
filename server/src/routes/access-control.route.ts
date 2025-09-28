import { Router, Request, Response } from 'express';
import * as authMiddleware from '../middleware/auth.js';
import { DatabaseAccessControlService } from '../services/access-control/database-access-control.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Define the structure for user information
interface User {
  email?: string;
  preferred_username?: string;
  username?: string;
  idTokenClaims?: {
    email?: string;
    preferred_username?: string;
  };
  [key: string]: any;
}

// Apply authentication middleware
const authRequired = process.env.AUTH_ENABLED === 'true';

/**
 * Check if the authenticated user is authorized to access upload functionality
 */
router.get('/check-authorization', authRequired ? authMiddleware.authenticateToken : (req, res, next) => next(), async (req: Request, res: Response) => {
  try {
    const user = req.user as User | undefined;
    
    if (!user) {
      return res.status(401).json({ 
        authorized: false, 
        message: 'User not authenticated' 
      });
    }

    // Extract email from the authenticated user object
    // Different systems may store email in different properties
    const userEmail = user.email || user.preferred_username || user.username || 
                     (user.idTokenClaims?.email || user.idTokenClaims?.preferred_username);
    
    if (!userEmail) {
      return res.status(400).json({ 
        authorized: false, 
        message: 'User email not found in authentication token' 
      });
    }

    // Check if user is authorized using the DatabaseAccessControlService
    const isAuthorized = await DatabaseAccessControlService.isUserAuthorized(userEmail);

    logger.info('Authorization check completed', {
      userEmail,
      isAuthorized,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      authorized: isAuthorized,
      email: userEmail
    });
  } catch (error) {
    logger.error('Error checking authorization:', error);
    return res.status(500).json({
      authorized: false,
      message: 'Internal server error'
    });
  }
});

export { router as accessControlRouter };