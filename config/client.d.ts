/**
 * Client-specific configuration
 */
export interface ClientConfig {
    api: {
        baseUrl: string;
        version: string;
        prefix: string;
    };
    ui: {
        title: string;
        theme: string;
    };
    features: {
        enableRbac: boolean;
        enableAuditLogging: boolean;
    };
}
export declare function getClientConfig(env: NodeJS.ProcessEnv): ClientConfig;
//# sourceMappingURL=client.d.ts.map