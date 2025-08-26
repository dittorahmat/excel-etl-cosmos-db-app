import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file explicitly
const envPath = resolve(__dirname, '../.env');
console.log('[dotenv] Attempting to load from:', envPath);
if (existsSync(envPath)) {
  const envConfig = dotenv.config({ path: envPath });
  console.log('[dotenv] Loaded config:', envConfig.parsed ? 'Success' : 'Failed');
  if (envConfig.parsed) {
    console.log('[dotenv] VITE_AZURE_REDIRECT_URI:', envConfig.parsed.VITE_AZURE_REDIRECT_URI || 'NOT SET');
  }
} else {
  console.log('[dotenv] .env file not found at:', envPath);
}

// Create config object with environment variables
const config = {
  VITE_AZURE_CLIENT_ID: process.env.VITE_AZURE_CLIENT_ID || '',
  VITE_AZURE_TENANT_ID: process.env.VITE_AZURE_TENANT_ID || '',
  VITE_AZURE_REDIRECT_URI: process.env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000',
  VITE_AZURE_SCOPES: process.env.VITE_AZURE_SCOPES || 'User.Read openid profile email',
  VITE_API_SCOPE: process.env.VITE_API_SCOPE || '',
  MODE: process.env.NODE_ENV || 'development',
  PROD: process.env.NODE_ENV === 'production',
  DEV: process.env.NODE_ENV !== 'production'
};

console.log('[config] Final config values:', {
  VITE_AZURE_REDIRECT_URI: config.VITE_AZURE_REDIRECT_URI,
  VITE_AUTH_ENABLED: config.VITE_AZURE_CLIENT_ID ? 'true' : 'false'
});

// Generate config file content
const configContent = `// This file is auto-generated during build
window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};

// Also set values in window.ENV for backward compatibility
if (!window.ENV) {
  window.ENV = {};
}
Object.assign(window.ENV, {
  VITE_AUTH_ENABLED: '${config.VITE_AZURE_CLIENT_ID ? 'true' : 'false'}',
  AUTH_ENABLED: '${config.VITE_AZURE_CLIENT_ID ? 'true' : 'false'}',
  VITE_AZURE_CLIENT_ID: '${config.VITE_AZURE_CLIENT_ID || ''}',
  VITE_AZURE_TENANT_ID: '${config.VITE_AZURE_TENANT_ID || ''}',
  VITE_AZURE_REDIRECT_URI: '${config.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000'}',
  NODE_ENV: '${config.MODE || 'production'}',
  MODE: '${config.MODE || 'production'}'
});

// Set dummy auth flags based on auth enabled status
window.USE_DUMMY_AUTH = ${config.VITE_AZURE_CLIENT_ID ? 'false' : 'true'};
window.FORCE_DUMMY_AUTH = ${config.VITE_AZURE_CLIENT_ID ? 'false' : 'true'};`;

// Ensure public directory exists
const publicDir = resolve(__dirname, '../public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// Write config to public directory
const configPath = join(publicDir, 'config.js');
writeFileSync(configPath, configContent);
console.log('Config file written to:', configPath);

// Also write to dist directory if it exists
const distDir = resolve(__dirname, '../dist');
if (existsSync(distDir)) {
  const distConfigPath = join(distDir, 'config.js');
  writeFileSync(distConfigPath, configContent);
  console.log('Config file written to:', distConfigPath);
}
