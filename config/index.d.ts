export declare const config: {
    readonly env: NodeJS.ProcessEnv;
    readonly shared: import("./shared").SharedConfig;
    readonly server: import("./server").ServerConfig;
    readonly client: import("./client").ClientConfig;
};
export type Config = typeof config;
export declare const shared: import("./shared").SharedConfig, server: import("./server").ServerConfig, client: import("./client").ClientConfig;
export default config;
//# sourceMappingURL=index.d.ts.map