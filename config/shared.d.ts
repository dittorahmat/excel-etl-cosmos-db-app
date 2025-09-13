/**
 * Shared configuration used by both client and server
 */
export interface SharedConfig {
    azure: {
        tenantId: string;
        clientId: string;
        redirectUri: string;
        scopes: string[];
        authority: string;
        apiScope: string;
    };
    auth: {
        enabled: boolean;
    };
    api: {
        baseUrl: string;
    };
    env: {
        nodeEnv: string;
        isDevelopment: boolean;
        isProduction: boolean;
    };
}
export declare function getSharedConfig(env: NodeJS.ProcessEnv): SharedConfig;
//# sourceMappingURL=shared.d.ts.map