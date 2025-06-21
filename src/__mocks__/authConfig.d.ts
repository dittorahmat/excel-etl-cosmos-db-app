export declare const msalConfig: {
    auth: {
        clientId: string;
        authority: string;
        redirectUri: string;
        postLogoutRedirectUri: string;
        navigateToLoginRequestUrl: boolean;
    };
    cache: {
        cacheLocation: string;
        storeAuthStateInCookie: boolean;
    };
};
export declare const loginRequest: {
    scopes: string[];
};
export declare const tokenRequest: {
    scopes: string[];
    forceRefresh: boolean;
};
