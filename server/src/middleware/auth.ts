import type { Request, Response, NextFunction } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
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

// MSAL client factory function
const createMsalClient = () => {
  // In test environment, return a mock client
  if (process.env.NODE_ENV === 'test') {
    return {
      getTokenCache: () => ({
        getAccountByHomeId: () => null,
        getAccountByLocalId: () => null,
        getAccountByUsername: () => null,
        getAllAccounts: () => [],
      }),
      acquireTokenByClientCredential: async () => ({
        accessToken: 'mock-access-token',
        expiresOn: new Date(Date.now() + 3600 * 1000),
      }),
    } as unknown as ConfidentialClientApplication;
  }

  // In production/development, create a real client
  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID || '',
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: any, message: string, containsPii: boolean) => {
          if (containsPii) return;
          console.log(`MSAL ${level}: ${message}`);
        },
        piiLoggingEnabled: false,
        logLevel: 3, // Error
      },
    },
  };

  return new ConfidentialClientApplication(msalConfig);
};

// Initialize MSAL client
const msalClient = createMsalClient();

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

// Middleware to validate JWT tokens
export const validateToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication if disabled
  if (process.env.AUTH_ENABLED === 'false') {
    return next();
  }

  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No token provided',
    });
  }

  const token = authHeader.split(' ')[1];

  // Verify the token
  const validationOptions = {
    audience: process.env.AZURE_CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    algorithms: ['RS256'] as jwt.Algorithm[],
  };

  jwt.verify(token, getKey as any, validationOptions, (err, decoded) => {
    if (err) {
      console.error('Token validation error:', err);
      return res.status(401).json({
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
 * Returns 401 if no token is provided
 * Returns 403 if token is invalid or expired
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

  try {
    // In test environment, use a simple verification
    if (process.env.NODE_ENV === 'test') {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      req.user = decoded as TokenPayload;
      return next();
    }

    // In other environments, use the full verification
    jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key',
      (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err) {
          console.warn('[auth] Invalid or expired token', { error: err });
          return res.status(403).json({ 
            success: false, 
            error: 'Authentication failed',
            message: 'Invalid or expired token' 
          });
        }
        console.info('[auth] Token decoded successfully');
        req.user = decoded as TokenPayload;
        next();
      }
    );
  } catch (error) {
    console.error('[auth] Error in token verification:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to authenticate token'
    });
  }
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
