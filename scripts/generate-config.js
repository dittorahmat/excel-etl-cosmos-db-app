import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Temporarily use the old approach to avoid compilation issues
// import { config } from '../config/index.js';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file explicitly
const envPath = resolve(__dirname, '../.env');
console.log('[dotenv] Attempting to load from:', envPath);
let envConfig = {};
if (existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  console.log('[dotenv] Loaded config:', result.parsed ? 'Success' : 'Failed');
  if (result.parsed) {
    envConfig = result.parsed;
    console.log('[dotenv] VITE_AZURE_REDIRECT_URI:', envConfig.VITE_AZURE_REDIRECT_URI || 'NOT SET');
    console.log('[dotenv] VITE_AUTH_ENABLED:', envConfig.VITE_AUTH_ENABLED || 'NOT SET');
    console.log('[dotenv] AUTH_ENABLED:', envConfig.AUTH_ENABLED || 'NOT SET');
  }
} else {
  console.log('[dotenv] .env file not found at:', envPath);
}

// Create config object with environment variables
// Priority: dotenv config > defaults (ignore process.env as it's not being set correctly)
const config = {
  VITE_AZURE_CLIENT_ID: envConfig.VITE_AZURE_CLIENT_ID || '',
  VITE_AZURE_TENANT_ID: envConfig.VITE_AZURE_TENANT_ID || '',
  VITE_AZURE_REDIRECT_URI: envConfig.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000',
  VITE_AZURE_SCOPES: envConfig.VITE_AZURE_SCOPES || 'User.Read openid profile email',
  VITE_API_SCOPE: envConfig.VITE_API_SCOPE || '',
  VITE_AUTH_ENABLED: envConfig.VITE_AUTH_ENABLED || 'false',
  AUTH_ENABLED: envConfig.AUTH_ENABLED || 'false',
  MODE: envConfig.NODE_ENV || 'development',
  PROD: (envConfig.NODE_ENV || 'development') === 'production',
  DEV: (envConfig.NODE_ENV || 'development') !== 'production'
};;

console.log('[config] Final config values:', {
  VITE_AZURE_REDIRECT_URI: config.VITE_AZURE_REDIRECT_URI,
  VITE_AUTH_ENABLED: config.VITE_AUTH_ENABLED,
  AUTH_ENABLED: config.AUTH_ENABLED
});

// Generate config file content
const configContent = `// This file is auto-generated during build
window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};

// Also set values in window.ENV for backward compatibility
if (!window.ENV) {
  window.ENV = {};
}
Object.assign(window.ENV, {
  VITE_AUTH_ENABLED: '${config.VITE_AUTH_ENABLED}',
  AUTH_ENABLED: '${config.AUTH_ENABLED}',
  VITE_AZURE_CLIENT_ID: '${config.VITE_AZURE_CLIENT_ID || ''}',
  VITE_AZURE_TENANT_ID: '${config.VITE_AZURE_TENANT_ID || ''}',
  VITE_AZURE_REDIRECT_URI: '${config.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000'}',
  NODE_ENV: '${config.MODE || 'production'}',
  MODE: '${config.MODE || 'production'}'
});

// Set dummy auth flags based on auth enabled status
window.USE_DUMMY_AUTH = ${config.VITE_AUTH_ENABLED === 'true' ? 'false' : 'true'};
window.FORCE_DUMMY_AUTH = ${config.VITE_AUTH_ENABLED === 'true' ? 'false' : 'true'};`;

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
