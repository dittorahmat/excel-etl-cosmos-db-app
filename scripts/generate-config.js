import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Create config object with environment variables
const config = {
  VITE_AZURE_CLIENT_ID: process.env.VITE_AZURE_CLIENT_ID || '',
  VITE_AZURE_TENANT_ID: process.env.VITE_AZURE_TENANT_ID || '',
  VITE_AZURE_REDIRECT_URI: process.env.VITE_AZURE_REDIRECT_URI || 'http://localhost:3000',
  VITE_AZURE_SCOPES: process.env.VITE_AZURE_SCOPES || 'User.Read openid profile email',
  MODE: process.env.NODE_ENV || 'development',
  PROD: process.env.NODE_ENV === 'production',
  DEV: process.env.NODE_ENV !== 'production'
};

// Generate config file content
const configContent = `// This file is auto-generated during build
window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};`;

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
