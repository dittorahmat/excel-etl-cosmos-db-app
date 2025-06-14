import { PublicClientApplication, CryptoProvider } from '@azure/msal-node';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import open from 'open';
import http from 'http';

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
      loggerCallback: (loglevel, message) => console.log(message),
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
    
    console.log('✅ Authentication URL generated successfully');
    console.log('\nNext steps:');
    console.log('1. The authentication page will open in your default browser');
    console.log('2. Sign in with your Azure AD account');
    console.log('3. After sign-in, you will be automatically redirected back to the local server');
    
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
    console.error('❌ Error:', error.message);
    if (error.errorCode) {
      console.log(`\nError Code: ${error.errorCode}`);
      console.log('Possible issues:');
      
      if (error.errorCode === 'invalid_client') {
        console.log('- The application might not have the required API permissions');
        console.log('- The redirect URI might not be configured correctly');
        console.log('- The client ID or tenant ID might be incorrect');
      } else if (error.errorCode === 'AADSTS50011') {
        console.log('- The reply URL specified in the request does not match the reply URLs configured for the application');
        console.log('  Please check your app registration in Azure Portal:');
        console.log('  1. Go to Azure Portal > App registrations > Your app > Authentication');
        console.log('  2. Under "Platform configurations", ensure "http://localhost:3000" is added as a redirect URI');
      } else if (error.errorCode === 'AADSTS65001') {
        console.log('- The user or administrator has not consented to use the application');
        console.log('  Please have an admin grant consent to the application');
      }
    }
    
    console.log('\nFull error details:');
    console.error(JSON.stringify(error, null, 2));
  }
}

// Extract code from URL if full URL is provided
function extractCodeFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    return params.get('code');
  } catch (e) {
    return url; // If it's not a URL, assume it's just the code
  }
}

// Run the test
if (process.argv.length < 3) {
  try {
    const { code, codeVerifier } = await testAuth();
    
    console.log('\nExchanging authorization code for token...');
    const tokenResponse = await pca.acquireTokenByCode({
      scopes: ['User.Read', 'openid', 'profile', 'email'],
      redirectUri: 'http://localhost:3000',
      code: code,
      codeVerifier: codeVerifier
    });
    
    console.log('\n✅ Token acquired successfully!');
    console.log('\n=== Access Token ===');
    console.log(tokenResponse.accessToken);
    
    console.log('\n=== Token Details ===');
    console.log('Expires On:  ', new Date(tokenResponse.expiresOn).toLocaleString());
    console.log('Token Type:  ', tokenResponse.tokenType);
    console.log('Scopes:      ', tokenResponse.scopes.join(' '));
    
    // Decode and display ID token claims
    if (tokenResponse.idToken) {
      const idTokenClaims = JSON.parse(Buffer.from(tokenResponse.idToken.split('.')[1], 'base64').toString());
      console.log('\n=== ID Token Claims ===');
      console.log('Name:        ', idTokenClaims.name);
      console.log('Email:       ', idTokenClaims.email || idTokenClaims.preferred_username);
      console.log('Issuer:      ', idTokenClaims.iss);
      console.log('Audience:    ', idTokenClaims.aud);
      console.log('Issued At:   ', new Date(idTokenClaims.iat * 1000).toLocaleString());
      console.log('Expires At:  ', new Date(idTokenClaims.exp * 1000).toLocaleString());
    }
    
  } catch (error) {
    console.error('\n❌ Error exchanging auth code for token:');
    console.error('Error Code:   ', error.errorCode || 'N/A');
    console.error('Error Message:', error.message);
    
    if (error.errorCode === 'invalid_grant') {
      console.log('\nPossible issues:');
      console.log('- The authorization code has expired (they are only valid for a few minutes)');
      console.log('- The authorization code was already used');
      console.log('- The code verifier does not match the code challenge');
    }
    
    console.log('\nFull error details:');
    console.error(JSON.stringify(error, null, 2));
  }
}
