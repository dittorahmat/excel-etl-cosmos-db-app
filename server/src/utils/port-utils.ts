/**
 * Get the port number from environment variables or use default
 * @returns The port number to use for the server
 */
export function getPort(): number {
  // Check for Azure App Service specific port
  const port = process.env.WEBSITES_PORT || process.env.PORT || '3001';
  
  console.log(`Using port: ${port} (from ${process.env.WEBSITES_PORT ? 'AZURE' : process.env.PORT ? 'ENV' : 'DEFAULT'})`);
  
  if (!port) {
    const error = new Error('PORT environment variable is required');
    console.error(error.message);
    throw error;
  }
  
  const portNumber = parseInt(port, 10);
  console.log(`Server will start on port: ${portNumber}`);
  
  return portNumber;
}

/**
 * Check if a port is currently in use
 * @param port The port number to check
 * @returns Promise that resolves to true if the port is in use
 */
export async function isPortInUse(port: number): Promise<boolean> {
  const net = await import('net');
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

/**
 * Get the process ID of the process using a specific port
 * @param port The port number to check
 * @returns The process ID or null if not found
 */
export async function getProcessIdOnPort(port: number): Promise<number | null> {
  try {
    const { execSync } = await import('child_process');
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      const result = execSync(`netstat -ano | findstr :${port}`).toString();
      const match = result.match(/\s+(\d+)\s*$/m);
      return match ? parseInt(match[1], 10) : null;
    } else {
      const result = execSync(`lsof -i :${port} -t`).toString().trim();
      return result ? parseInt(result, 10) : null;
    }
  } catch (error) {
    console.error('Error getting process ID on port:', error);
    return null;
  }
}
