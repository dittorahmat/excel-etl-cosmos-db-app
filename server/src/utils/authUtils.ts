import { ConfidentialClientApplication, AuthenticationResult, Configuration } from '@azure/msal-node';
import { TokenPayload } from '../middleware/auth.js';

// Configuration for MSAL
const msalConfig: Configuration = {
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

/**
 * Acquires a token for the specified scopes
 */
export const acquireToken = async (scopes: string[] = []): Promise<AuthenticationResult | null> => {
  try {
    const tokenRequest = {
      scopes: scopes.length > 0 ? scopes : [process.env.AZURE_SCOPE || ''],
    };

    const response = await msalClient.acquireTokenByClientCredential(tokenRequest);
    return response || null;
  } catch (error) {
    console.error('Error acquiring token:', error);
    return null;
  }
};

/**
 * Validates if the user has the required roles
 */
export const hasRequiredRoles = (user: TokenPayload, requiredRoles: string[]): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  const userRoles = user.roles || [];
  return requiredRoles.some(role => userRoles.includes(role));
};

/**
 * Extracts token from the Authorization header
 */
export const getTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};
