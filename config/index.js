import { loadEnv } from './env.js';
import { getServerConfig } from './server.js';
import { getClientConfig } from './client.js';
import { getSharedConfig } from './shared.js';
// Load environment variables
const env = loadEnv();
// Create unified configuration object
export const config = {
    env,
    shared: getSharedConfig(env),
    server: getServerConfig(env),
    client: getClientConfig(env),
};
// Export individual parts for convenience
export const { shared, server, client } = config;
export default config;
