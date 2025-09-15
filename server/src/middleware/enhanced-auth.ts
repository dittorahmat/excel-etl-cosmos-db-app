import type { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { auditLogService } from '../services/audit/audit-log.service.js';
import { logger } from '../utils/logger.js';

// Type for the token payload
export interface TokenPayload extends JwtPayload {
  oid?: string;
  name?: string;
  email?: string;
  roles?: string[];
  scp?: string;
}

// Check if authentication is enabled
const isAuthEnabled = process.env.AUTH_ENABLED === 'true' || process.env.VITE_AUTH_ENABLED === 'true';

// Initialize JWKS client for token validation (only if auth is enabled)
let jwksClientInstance: jwksClient.JwksClient | null = null;

if (isAuthEnabled) {
  jwksClientInstance = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
  });
}

// Get the signing key for JWT validation
const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
  if (!isAuthEnabled) {
    // If auth is disabled, provide a mock key
    return callback(null, 'mock-key');
  }
  
  if (!jwksClientInstance) {
    return callback(new Error('JWKS client not initialized'));
  }
  
  if (!header.kid) {
    return callback(new Error('No KID in token header'));
  }

  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      return callback(err || new Error('Signing key not found'));
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
};

// Get client IP address from request
const getClientIp = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string) ||
         (req.headers['x-real-ip'] as string) ||
         req.socket.remoteAddress ||
         'unknown';
};

// Get user agent from request
const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

// Middleware to validate JWT tokens
const validateToken = async (token: string, req: Request): Promise<TokenPayload> => {
  return new Promise((resolve, reject) => {
    // In test environment or when auth is disabled, resolve with a mock payload
    if (process.env.NODE_ENV === 'test' || !isAuthEnabled) {
      const mockUser = {
        oid: 'test-user-oid',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['developer', 'admin'],
        scp: 'user_impersonation',
      };
      
      // Log the mock authentication
      auditLogService.logAuthEvent({
        userId: mockUser.oid,
        action: 'login',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: { authType: 'mock' }
      }).catch(err => logger.error('Failed to log mock auth event', { error: err }));
      
      return resolve(mockUser);
    }

    if (!token) {
      // Log failed authentication attempt
      auditLogService.logAuthEvent({
        userId: 'unknown',
        action: 'failed_login',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: { reason: 'No token provided' }
      }).catch(err => logger.error('Failed to log failed auth event', { error: err }));
      
      return reject(new Error('No token provided'));
    }

    jwt.verify(token, getKey, {
      algorithms: ['RS256'], // Specify the algorithm used by Azure AD
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }, async (err, decoded) => {
      if (err) {
        logger.error('JWT verification error:', err.message);
        
        // Log failed authentication attempt
        auditLogService.logAuthEvent({
          userId: 'unknown',
          action: 'failed_login',
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
          details: { reason: 'Invalid token', error: err.message }
        }).catch(logErr => logger.error('Failed to log failed auth event', { error: logErr }));
        
        return reject(err);
      }
      
      const user = decoded as TokenPayload;
      
      // Log successful authentication
      auditLogService.logAuthEvent({
        userId: user.oid || 'unknown',
        action: 'login',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: { authType: 'jwt' }
      }).catch(logErr => logger.error('Failed to log auth event', { error: logErr }));
      
      resolve(user);
    });
  });
};

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  // In test environment or when auth is disabled, bypass authentication
  if (process.env.NODE_ENV === 'test' || !isAuthEnabled) {
    req.user = {
      oid: 'test-user-oid',
      name: 'Test User',
      email: 'test@example.com',
      roles: ['developer', 'admin'],
      scp: 'user_impersonation',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No token provided' });
  }

  try {
    const user = await validateToken(token, req);
    req.user = user; // Attach user payload to request
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(403).json({ message: 'Access Denied: Invalid token' });
  }
};

const checkRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // In test environment or when auth is disabled, bypass role check
    if (process.env.NODE_ENV === 'test' || !isAuthEnabled) {
      return next();
    }

    // If no roles are required, just continue
    if (!requiredRoles || requiredRoles.length === 0) {
      return next();
    }

    if (!req.user || !req.user.roles) {
      return res.status(403).json({ message: 'Access Denied: No roles found for user' });
    }

    const hasRequiredRole = requiredRoles.some(role => req.user?.roles?.includes(role));
    if (hasRequiredRole) {
      next();
    } else {
      res.status(403).json({ message: 'Access Denied: Insufficient role' });
    }
  };
};

export { validateToken, authenticateToken, checkRole };