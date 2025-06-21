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
    system: {
        loggerOptions: {
            loggerCallback: (level: number, message: string, containsPii: boolean) => void;
            logLevel: string;
        };
    };
};
export declare const loginRequest: {
    scopes: any;
    prompt: string;
    extraQueryParameters: {
        client_id: string;
        response_type: string;
        response_mode: string;
        domain_hint: string;
    };
};
export declare const apiConfig: {
    scopes: string[];
    uri: string;
};
