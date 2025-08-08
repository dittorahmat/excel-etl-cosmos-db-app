export declare const msalConfig: {
    auth: {
        clientId: string;
        authority: string;
        redirectUri: string;
        postLogoutRedirectUri: string;
    };
    cache: {
        cacheLocation: string;
        storeAuthStateInCookie: boolean;
    };
};
export declare const loginRequest: {
    scopes: (string | undefined)[];
};
export declare const protectedResources: {
    api: {
        endpoint: string;
        scopes: (string | undefined)[];
    };
};
export declare const graphConfig: {
    graphMeEndpoint: string;
};
