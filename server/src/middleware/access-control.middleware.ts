import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define the structure for user information
interface User {
  email?: string;
  [key: string]: any;
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

    // Check if the user is authorized based on environment variable configuration
    const isAuthorized = await isUserAuthorized(user.email);
    
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

/**
 * Check if a user is authorized based on environment variable configuration
 */
async function isUserAuthorized(userEmail?: string): Promise<boolean> {
  if (!userEmail) {
    return false;
  }

  // Get authorized emails from environment variable
  const authorizedEmails = process.env.AUTHORIZED_UPLOAD_USERS || '';
  
  // If no emails are configured, allow all authenticated users (backward compatibility)
  if (!authorizedEmails.trim()) {
    return true;
  }

  // Check if the user's email is in the authorized list
  const emailList = authorizedEmails
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);
  
  return emailList.includes(userEmail.toLowerCase());
}