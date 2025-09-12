import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Import our unified configuration
import { config } from '../config/index.js';

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

// Create config object using unified configuration
const { shared, client } = config;

const unifiedConfig = {
  VITE_AZURE_CLIENT_ID: shared.azure.clientId,
  VITE_AZURE_TENANT_ID: shared.azure.tenantId,
  VITE_AZURE_REDIRECT_URI: shared.azure.redirectUri,
  VITE_AZURE_SCOPES: shared.azure.scopes.join(' '),
  VITE_API_SCOPE: shared.azure.apiScope,
  VITE_AUTH_ENABLED: shared.auth.enabled.toString(),
  AUTH_ENABLED: shared.auth.enabled.toString(),
  MODE: shared.env.nodeEnv,
  PROD: shared.env.isProduction,
  DEV: shared.env.isDevelopment
};

console.log('[config] Final config values:', {
  VITE_AZURE_REDIRECT_URI: unifiedConfig.VITE_AZURE_REDIRECT_URI,
  VITE_AUTH_ENABLED: unifiedConfig.VITE_AUTH_ENABLED,
  AUTH_ENABLED: unifiedConfig.AUTH_ENABLED
});

// Generate config file content
const configContent = `// This file is auto-generated during build
window.__APP_CONFIG__ = ${JSON.stringify(unifiedConfig, null, 2)};

// Also set values in window.ENV for backward compatibility
if (!window.ENV) {
  window.ENV = {};
}
Object.assign(window.ENV, {
  VITE_AUTH_ENABLED: '${unifiedConfig.VITE_AUTH_ENABLED}',
  AUTH_ENABLED: '${unifiedConfig.AUTH_ENABLED}',
  VITE_AZURE_CLIENT_ID: '${unifiedConfig.VITE_AZURE_CLIENT_ID || ''}',
  VITE_AZURE_TENANT_ID: '${unifiedConfig.VITE_AZURE_TENANT_ID || ''}',
  VITE_AZURE_REDIRECT_URI: '${unifiedConfig.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000'}',
  NODE_ENV: '${unifiedConfig.MODE || 'production'}',
  MODE: '${unifiedConfig.MODE || 'production'}'
});

// Set dummy auth flags based on auth enabled status
window.USE_DUMMY_AUTH = ${unifiedConfig.VITE_AUTH_ENABLED === 'true' ? 'false' : 'true'};
window.FORCE_DUMMY_AUTH = ${unifiedConfig.VITE_AUTH_ENABLED === 'true' ? 'false' : 'true'};`;

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
