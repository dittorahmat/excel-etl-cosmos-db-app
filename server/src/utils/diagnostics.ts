import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';

interface PathCheckResult {
  exists: boolean;
  error?: string;
  size?: number;
  isDirectory?: boolean;
}

export function checkPath(pathToCheck: string, isDir = true): PathCheckResult {
  try {
    const stats = fs.statSync(pathToCheck);
    return {
      exists: isDir ? stats.isDirectory() : stats.isFile(),
      size: stats.size,
      isDirectory: stats.isDirectory(),
    };
  } catch (error: any) {
    return { exists: false, error: error.message };
  }
}

export function logDirectoryStructure() {
  console.log('\n=== Directory Structure ===');
  const cwd = process.cwd();
  console.log(`Current directory: ${cwd}`);
  
  // Log root contents
  try {
    console.log('\nRoot contents:');
    console.log(fs.readdirSync(cwd).join('\n'));
  } catch (e: any) {
    console.error('Error reading directory:', e.message);
  }

  // Check dist directory
  const distPath = path.join(cwd, 'dist');
  const distCheck = checkPath(distPath, true);
  console.log(`\nDist directory: ${distCheck.exists ? '✓' : '✗'}`);
  
  if (distCheck.exists) {
    try {
      const serverJsPath = path.join(distPath, 'server.js');
      const serverJsCheck = checkPath(serverJsPath, false);
      console.log(`Server entry: ${serverJsCheck.exists ? '✓' : '✗'}`);
    } catch (e: any) {
      console.error('Error checking server entry:', e.message);
    }
  }
}

export function logEnvironmentConfig() {
  console.log('\n=== Environment ===');
  console.log(`NODE_ENV: ${env.NODE_ENV || 'development'}`);
  console.log(`PORT: ${env.PORT || 'Not set'}`);
  console.log(`WEBSITES_PORT: ${env.WEBSITES_PORT || 'Not set'}`);
}
