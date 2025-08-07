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
  } catch (error: unknown) {
    return { exists: false, error: error instanceof Error ? error.message : String(error) };
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
  } catch (_e: unknown) {
    console.error('Error reading directory:', _e instanceof Error ? _e.message : String(_e));
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
    } catch (_e: unknown) {
      console.error('Error checking server entry:', _e instanceof Error ? _e.message : String(_e));
    }
  }
}

export function logEnvironmentConfig() {
  console.log('\n=== Environment ===');
  console.log(`NODE_ENV: ${env.NODE_ENV || 'development'}`);
  console.log(`PORT: ${env.PORT || 'Not set'}`);
  console.log(`WEBSITES_PORT: ${env.WEBSITES_PORT || 'Not set'}`);
}
