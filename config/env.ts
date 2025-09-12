import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from .env file
 */
export function loadEnv() {
  // Try to load environment variables from the .env file
  const envPaths = [
    path.resolve(__dirname, '../.env'), // for dist
    path.resolve(__dirname, '../.env')   // for src
  ];
  
  // Initialize result
  let result: { parsed: { [key: string]: string } | undefined } = { parsed: undefined };
  
  // Try each path until we find a valid .env file
  for (const envPath of envPaths) {
    try {
      const envConfig = dotenv.config({ path: envPath });
      if (!envConfig.error && envConfig.parsed) {
        result = { parsed: envConfig.parsed };
        break;
      }
    } catch (error) {
      console.error(`Error loading .env from ${envPath}:`, error);
    }
  }
  
  if (!result.parsed) {
    console.warn('No .env file found. Using environment variables from process.env');
    result.parsed = {};
  }

  // Manually set process.env with the parsed values to ensure they're available
  for (const [key, value] of Object.entries(result.parsed || {})) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }

  return process.env;
}

export type Env = ReturnType<typeof loadEnv>;