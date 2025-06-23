/* eslint-env node */

/** @type {import('@azure/msal-node').PublicClientApplication} */
import { PublicClientApplication, CryptoProvider } from '@azure/msal-node';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';
import http from 'http';

// Disable console logging for production
const logger = {
  log: (...args) => process.env.NODE_ENV !== 'production' && console.log(...args),
  error: (...args) => process.env.NODE_ENV !== 'production' && console.error(...args),
  info: (...args) => process.env.NODE_ENV !== 'production' && console.info(...args)
};

// Get the current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const msalConfig = {
  auth: {
    clientId: process.env.VITE_AZURE_CLIENT_ID,
    authority: process.env.VITE_AZURE_AUTHORITY,
  },
  system: {
    loggerOptions: {
      loggerCallback: (loglevel, message) => logger.log(message),
      logLevel: 'Info',
    },
  },
};

const pca = new PublicClientApplication(msalConfig);
const cryptoProvider = new CryptoProvider();

// Start a simple HTTP server to handle the redirect
async function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (code) {
        res.end('Authentication successful! You can close this window and return to the terminal.');
        server.close(() => resolve({ code, error, errorDescription }));
      } else if (error) {
        res.end(`Error: ${error}\n${errorDescription || ''}`);
        server.close(() => resolve({ error, errorDescription }));
      } else {
        res.end('Invalid request');
      }
    });

    server.listen(3000, 'localhost', () => {
      console.log('Local server listening on http://localhost:3000');
    });
  });
}

async function testAuth() {
  try {
    console.log('Testing authentication...');
    
    // Generate PKCE code verifier and challenge
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();
    
    // Get auth code URL with PKCE
    const authCodeUrl = await pca.getAuthCodeUrl({
      scopes: ['User.Read', 'openid', 'profile', 'email'],
      redirectUri: 'http://localhost:3000',
      prompt: 'select_account',
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      responseMode: 'query'
    });
    
    logger.log('✅ Authentication URL generated successfully');
    logger.log('\nNext steps:');
    logger.log('1. The authentication page will open in your default browser');
    logger.log('2. Sign in with your Azure AD account');
    logger.log('3. After sign-in, you will be automatically redirected back to the local server');
    
    // Open the authentication URL in the default browser
    await open(authCodeUrl);
    
    // Start the local server to handle the redirect
    const result = await startServer();
    
    if (result.error) {
      throw new Error(`Authentication failed: ${result.error} - ${result.errorDescription || ''}`);
    }
    
    // Return the authorization code and code verifier
    return { code: result.code, codeVerifier: verifier };
    
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

// Run the test
if (process.argv.length < 3) {
  try {
    const { code, codeVerifier } = await testAuth();
    
    logger.log('\nExchanging authorization code for token...');
    const tokenResponse = await pca.acquireTokenByCode({
      scopes: ['User.Read', 'openid', 'profile', 'email'],
      redirectUri: 'http://localhost:3000',
      code: code,
      codeVerifier: codeVerifier
    });
    
    logger.log('\n✅ Token acquired successfully!');
    logger.log('\n=== Access Token ===');
    logger.log(tokenResponse.accessToken);
    
    logger.log('\n=== Token Details ===');
    logger.log('Expires On:  ', new Date(tokenResponse.expiresOn).toLocaleString());
    logger.log('Token Type:  ', tokenResponse.tokenType);
    logger.log('Scopes:      ', tokenResponse.scopes.join(' '));
    
    // Decode and display ID token claims
    if (tokenResponse.idToken) {
      const idTokenClaims = JSON.parse(Buffer.from(tokenResponse.idToken.split('.')[1], 'base64').toString());
      logger.log('\n=== ID Token Claims ===');
      logger.log('Name:        ', idTokenClaims.name);
      logger.log('Email:       ', idTokenClaims.email || idTokenClaims.preferred_username);
      logger.log('Issuer:      ', idTokenClaims.iss);
      logger.log('Audience:    ', idTokenClaims.aud);
      logger.log('Issued At:   ', new Date(idTokenClaims.iat * 1000).toLocaleString());
      logger.log('Expires At:  ', new Date(idTokenClaims.exp * 1000).toLocaleString());
    }
    
  } catch (error) {
    logger.error('\n❌ Error exchanging auth code for token:');
    logger.error('Error Code:   ', error.errorCode || 'N/A');
    logger.error('Error Message:', error.message);
    
    if (error.errorCode === 'invalid_grant') {
      logger.log('\nPossible issues:');
      logger.log('- The authorization code has expired (they are only valid for a few minutes)');
      logger.log('- The authorization code was already used');
      logger.log('- The code verifier does not match the code challenge');
    }
    
    console.log('\nFull error details:');
    console.error(JSON.stringify(error, null, 2));
  }
}
