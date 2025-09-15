import type { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

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

// Middleware to validate JWT tokens
const validateToken = (token: string): Promise<TokenPayload> => {
  return new Promise((resolve, reject) => {
    // In test environment or when auth is disabled, resolve with a mock payload
    if (process.env.NODE_ENV === 'test' || !isAuthEnabled) {
      return resolve({
        oid: 'test-user-oid',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['developer', 'admin'],
        scp: 'user_impersonation',
      });
    }

    if (!token) {
      return reject(new Error('No token provided'));
    }

    jwt.verify(token, getKey, {
      algorithms: ['RS256'], // Specify the algorithm used by Azure AD
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err.message);
        return reject(err);
      }
      resolve(decoded as TokenPayload);
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
    const user = await validateToken(token);
    req.user = user; // Attach user payload to request
    next();
  } catch (error) {
    console.error('Authentication error:', error);
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

