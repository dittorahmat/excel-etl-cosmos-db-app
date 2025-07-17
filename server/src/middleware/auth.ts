import type { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from 'dotenv';

// Load environment variables
config();

// Type for the token payload
export interface TokenPayload extends JwtPayload {
  oid?: string;
  name?: string;
  email?: string;
  roles?: string[];
  scp?: string;
}



// Initialize JWKS client for token validation
const jwksClientInstance = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
});

// Get the signing key for JWT validation
const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
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

// Development mock token for testing
const DEV_MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// Middleware to validate JWT tokens
export const validateToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication if disabled
  if (process.env.AUTH_ENABLED === 'false') {
    console.log('Authentication is disabled, skipping token validation');
    // Add a mock user in development when auth is disabled
    if (process.env.NODE_ENV === 'development') {
      req.user = {
        oid: 'dev-user',
        name: 'Development User',
        email: 'dev@example.com',
        roles: ['admin'],
      };
    }
    return next();
  }

  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  // In development, accept the mock token
  if (process.env.NODE_ENV === 'development' && token === DEV_MOCK_TOKEN) {
    console.log('Development mode: Using mock token');
    req.user = {
      sub: '1234567890',
      name: 'Dev User',
      email: 'dev@example.com',
      roles: ['admin'],
      iat: Math.floor(Date.now() / 1000) - 30, // 30 seconds ago
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    };
    return next();
  }

  // Verify the token in production
  const validationOptions = {
    audience: process.env.AZURE_CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    algorithms: ['RS256'] as jwt.Algorithm[],
  };

  jwt.verify(token, getKey, validationOptions, (err, decoded) => {
    if (err) {
      console.error('Token validation error:', err);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Add the decoded token to the request object
    req.user = decoded as TokenPayload;
    next();
  });
};

/**
 * Middleware to authenticate JWT token
 * Returns 401 if no token is provided and AUTH_ENABLED is true
 * Returns 403 if token is invalid or expired
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip authentication if disabled
  if (process.env.AUTH_ENABLED === 'false') {
    console.log('[auth] Authentication is disabled, skipping token validation');
    return next();
  }
  
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.warn('[auth] No token provided in Authorization header', { headers: req.headers });
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  // In test environment, use a simple verification
    if (process.env.NODE_ENV === 'test') {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        req.user = decoded as TokenPayload;
        return next();
      } catch (error) {
        console.error('[auth] Error in test token verification:', error);
        if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
          return res.status(403).json({
            success: false,
            error: 'Authentication failed',
            message: 'Invalid or expired token'
          });
        }
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to authenticate token'
        });
      }
    }

    // In other environments, use the full verification
    jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key',
      { algorithms: ['HS256'] }, // Add algorithms option
      (err, decoded) => {
        if (err) {
          console.warn('[auth] Invalid or expired token', { error: err });
          if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return res.status(403).json({
              success: false,
              error: 'Authentication failed',
              message: 'Invalid or expired token'
            });
          }
          return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Failed to authenticate token'
          });
        }
        console.info('[auth] Token decoded successfully');
        req.user = decoded as TokenPayload;
        next();
      }
    );
};

// Middleware to check for required roles
export const checkRole = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.AUTH_ENABLED === 'false') {
      return next();
    }

    const user = req.user as TokenPayload;

    // If no roles are required, just continue
    if (!requiredRoles || requiredRoles.length === 0) {
      return next();
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some(role => user.roles?.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};
