import { LogLevel } from '@azure/msal-browser';
export declare const azureAdConfig: {
    readonly clientId: string;
    readonly tenantId: string;
    readonly redirectUri: string;
    readonly scopes: string[];
    readonly authority: `https://login.microsoftonline.com/${string}`;
    readonly knownAuthorities: readonly ["login.microsoftonline.com", `https://login.microsoftonline.com/${string}`];
    readonly apiScope: string;
};
export declare const msalConfig: {
    auth: {
        clientId: string;
        authority: `https://login.microsoftonline.com/${string}`;
        knownAuthorities: readonly ["login.microsoftonline.com", `https://login.microsoftonline.com/${string}`];
        redirectUri: string;
        postLogoutRedirectUri: string;
        navigateToLoginRequestUrl: boolean;
    };
    cache: {
        cacheLocation: string;
        storeAuthStateInCookie: boolean;
    };
    system: {
        loggerOptions: {
            loggerCallback: (level: number, message: string, containsPii: boolean) => void;
            logLevel: LogLevel;
        };
    };
};
export declare const loginRequest: {
    scopes: string[];
    prompt: string;
};
export declare const getApiConfig: () => {
    scopes: string[];
    uri: string;
};
