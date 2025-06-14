import dotenv from 'dotenv';
import { PublicClientApplication, AuthenticationResult } from '@azure/msal-node';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Configuration
const config = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
  scopes: [process.env.AZURE_SCOPE || ''],
  apiUrl: 'http://localhost:3001', // Update with your API URL
};

// Initialize MSAL client
const pca = new PublicClientApplication({
  auth: config.auth,
  system: {
    loggerOptions: {
      loggerCallback: (logLevel: any, message: string) => {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: 3, // Error
    },
  },
});

/**
 * Acquires a token interactively
 */
async function acquireToken(): Promise<string | null> {
  try {
    const result = await pca.acquireTokenByDeviceCode({
      scopes: config.scopes,
      deviceCodeCallback: (response) => {
        console.log(response.message);
      },
    });
    return result?.accessToken || null;
  } catch (error) {
    console.error('Error acquiring token:', error);
    return null;
  }
}

/**
 * Tests a protected endpoint
 */
async function testProtectedEndpoint(token: string): Promise<void> {
  try {
    const response = await axios.get(`${config.apiUrl}/api/protected`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Protected endpoint response:', response.data);
  } catch (error: any) {
    console.error('Error testing protected endpoint:', error.response?.data || error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting Azure AD authentication test...');
  
  // Skip if authentication is disabled
  if (process.env.AUTH_ENABLED === 'false') {
    console.log('Authentication is disabled. Set AUTH_ENABLED=true in .env to test authentication.');
    return;
  }

  // Acquire token
  console.log('Acquiring token...');
  const token = await acquireToken();
  
  if (!token) {
    console.error('Failed to acquire token');
    return;
  }

  console.log('Token acquired successfully!');
  
  // Test protected endpoint
  console.log('Testing protected endpoint...');
  await testProtectedEndpoint(token);
}

// Run the test
main().catch(console.error);
