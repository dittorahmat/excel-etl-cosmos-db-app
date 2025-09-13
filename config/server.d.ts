/**
 * Server-specific configuration
 */
export interface ServerConfig {
    server: {
        port: number;
        host: string;
    };
    azureStorage: {
        connectionString: string;
        account: string;
        key: string;
        container: string;
    };
    azureCosmos: {
        endpoint: string;
        key: string;
        database: string;
        container: string;
        partitionKey: string;
    };
    cors: {
        origins: string[];
    };
    fileUpload: {
        sizeLimit: number;
        allowedTypes: string[];
    };
    logging: {
        level: string;
        format: string;
    };
    security: {
        sessionSecret: string;
    };
}
export declare function getServerConfig(env: NodeJS.ProcessEnv): ServerConfig;
//# sourceMappingURL=server.d.ts.map