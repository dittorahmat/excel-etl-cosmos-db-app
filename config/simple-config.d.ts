declare const config: {
  shared: {
    env: {
      isDevelopment: boolean;
      isProduction: boolean;
    };
    auth: {
      enabled: boolean;
    };
    azure: {
      clientId: string;
      tenantId: string;
      redirectUri: string;
      apiScope: string;
      scopes: string[];
      authority: string;
    };
    api: {
      baseUrl: string;
    };
  };
  client: {
    api: {
      baseUrl: string;
    };
  };
  server: any;
};

export default config;
export { config };