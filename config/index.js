import { loadEnv } from './env';
import { getServerConfig } from './server';
import { getClientConfig } from './client';
import { getSharedConfig } from './shared';
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
