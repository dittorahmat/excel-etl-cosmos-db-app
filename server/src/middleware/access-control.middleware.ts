import { Request, Response, NextFunction } from 'express';
import { DatabaseAccessControlService } from '../services/access-control/database-access-control.service.js';

// Define the user type
interface AuthenticatedUser {
  email?: string;
  emails?: string[];  // Some providers use array of emails
  upn?: string;       // Azure AD often uses upn (User Principal Name)
  preferred_username?: string;  // Common in OAuth providers
  name?: string;
  oid?: string;
  [key: string]: unknown;
}

// Extend the Express Request type to include the user property
interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Helper function to extract email from user object
 * Azure AD tokens may have email in different fields
 */
function extractEmailFromUser(user: AuthenticatedUser | undefined): string | null {
  if (!user) {
    return null;
  }

  // Try different possible email fields
  return user.email || 
         (user.emails && user.emails.length > 0 ? user.emails[0] : null) ||
         user.upn || 
         user.preferred_username || 
         null;
}

/**
 * Access control middleware to check if the user is authorized to access a resource
 */
export async function accessControlMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Get the user from req.user that was set by the authentication middleware
    const user = req.user;
    
    // Extract email from user object, checking different possible fields
    const userEmail = extractEmailFromUser(user);
    
    if (!user || !userEmail) {
      console.log('Access control: No user or user email found on request object', {
        hasUser: !!user,
        userEmail: userEmail,
        userHasEmail: !!user?.email,
        userHasUpn: !!user?.upn,
        userHasPreferredUsername: !!user?.preferred_username,
        userHasEmails: !!(user?.emails && user.emails.length > 0)
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if the user is authorized using the DatabaseAccessControlService
    const isAuthorized = await DatabaseAccessControlService.isUserAuthorized(userEmail);
    
    if (!isAuthorized) {
      // Log the access attempt for security monitoring
      console.log('Access control check failed', {
        userEmail: userEmail,
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