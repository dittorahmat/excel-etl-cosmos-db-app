import type { Configuration } from '@azure/msal-browser';
export declare const TOKEN_REFRESH_BUFFER: number;
export declare const assertMsalConfig: (config: unknown) => config is Configuration;
export declare const isTokenExpired: (tokenExpiresOn: number) => boolean;
