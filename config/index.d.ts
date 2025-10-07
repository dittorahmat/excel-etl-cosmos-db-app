export declare const config: {
    readonly env: NodeJS.ProcessEnv;
    readonly shared: import("./shared.js").SharedConfig;
    readonly server: import("./server.js").ServerConfig;
    readonly client: import("./client.js").ClientConfig;
};
export type Config = typeof config;
export declare const shared: import("./shared.js").SharedConfig, server: import("./server.js").ServerConfig, client: import("./client.js").ClientConfig;
export default config;
//# sourceMappingURL=index.d.ts.map