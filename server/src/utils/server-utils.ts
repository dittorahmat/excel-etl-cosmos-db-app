import fs from 'fs';
import net from 'net';
import { exec } from 'child_process';
import { logger } from './logger.js';

/**
 * Get the port from environment variable with fallback
 * @returns {number} The port number to use
 */
export function getPort(): number {
  const envPort = process.env.PORT || '3001';
  let port = 3001; // Default port

  // Parse the port from environment variable
  if (envPort) {
    const parsedPort = parseInt(envPort, 10);
    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
      port = parsedPort;
    } else {
      logger.warn(`Invalid PORT environment variable: ${envPort}. Using default port 3001.`);
    }
  }

  // In production, use the port provided by Azure App Service
  if (process.env.WEBSITES_PORT) {
    const azurePort = parseInt(process.env.WEBSITES_PORT, 10);
    if (!isNaN(azurePort) && azurePort > 0 && azurePort < 65536) {
      port = azurePort;
    }
  }

  return port;
}

/**
 * Check if a path exists and is accessible
 * @param pathToCheck The path to check
 * @param isDir Whether the path should be a directory (default: true)
 * @returns {boolean} True if the path exists and is accessible, false otherwise
 */
export function checkPath(pathToCheck: string, isDir = true): boolean {
  try {
    const stats = fs.statSync(pathToCheck);
    return isDir ? stats.isDirectory() : stats.isFile();
  } catch (error) {
    logger.error(`Path check failed: ${pathToCheck}`, { error });
    return false;
  }
}

/**
 * Check if a port is in use
 * @param port The port to check
 * @returns {Promise<boolean>} True if the port is in use, false otherwise
 */
export async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        resolve(true);
      })
      .once('listening', () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

/**
 * Get the process ID using a specific port
 * @param port The port to check
 * @returns {Promise<string | null>} The process ID or null if not found
 */
export async function getProcessIdOnPort(port: number): Promise<string | null> {
  return new Promise((resolve) => {
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port} -t`;

    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error || stderr) {
        logger.error(`Error finding process on port ${port}:`, { error, stderr });
        return resolve(null);
      }

      const lines = stdout.trim().split('\n');
      if (lines.length === 0) {
        return resolve(null);
      }

      // On Windows, extract the PID from the netstat output
      if (process.platform === 'win32') {
        const match = stdout.match(/\s+(\d+)\s*$/m);
        return resolve(match ? match[1] : null);
      }

      // On Unix-like systems, the output is just the PID
      resolve(lines[0].trim() || null);
    });
  });
}
