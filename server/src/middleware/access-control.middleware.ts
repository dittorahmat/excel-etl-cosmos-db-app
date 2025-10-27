import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseAccessControlService } from '../services/access-control/database-access-control.service.js';

// Define the structure for user information
interface User {
  email?: string;
  [key: string]: unknown;
}

/**
 * Access control middleware to check if the user is authorized to access a resource
 */
export async function accessControlMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the user from the token (assuming authentication already happened)
    const user = await getUserFromToken(req.headers.authorization);
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if the user is authorized using the DatabaseAccessControlService
    const isAuthorized = await DatabaseAccessControlService.isUserAuthorized(user.email);
    
    if (!isAuthorized) {
      // Log the access attempt for security monitoring
      console.log('Access control check failed', {
        userEmail: user.email,
        resource: req.path,
        authorized: isAuthorized,
        timestamp: new Date().toISOString()
      });
      
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // User is authorized, proceed to the next middleware
    next();
    return; // Explicitly return to satisfy TypeScript
  } catch (error) {
    console.error('Error in access control middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Extract user information from authentication token
 */
async function getUserFromToken(authorizationHeader?: string): Promise<User | null> {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.substring(7);

  try {
    // If using Azure AD or similar, we would validate the token against the issuer
    // For now, we'll implement a basic JWT validation
    
    // If using custom auth, we may need to validate the token differently
    // This is a simplified example - real implementation would use proper validation
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === 'object') {
      return decoded as User;
    }
    return null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}