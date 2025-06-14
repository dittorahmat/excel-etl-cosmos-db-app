import { Request, Response, NextFunction } from 'express';
import { ConfidentialClientApplication } from '@azure/msal-node';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from 'dotenv';

// Load environment variables
config();

// Type for the token payload
export interface TokenPayload extends jwt.JwtPayload {
  oid?: string;
  name?: string;
  email?: string;
  roles?: string[];
  scp?: string;
}

// Initialize MSAL client
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback: (logLevel: any, message: string) => {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: 3, // Error
    },
  },
};

const msalClient = new ConfidentialClientApplication(msalConfig);

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
    if (err) {
      return callback(err);
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
    algorithms: ['RS256'],
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
