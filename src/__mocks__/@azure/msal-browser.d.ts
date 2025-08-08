export declare const PublicClientApplication: import("vitest").Mock<(...args: any[]) => any>;
export declare const InteractionRequiredAuthError: {
    new (message: string, errorCode?: string): {
        errorCode: string;
        name: string;
        message: string;
        stack?: string;
    };
    captureStackTrace(targetObject: object, constructorOpt?: Function): void;
    prepareStackTrace(err: Error, stackTraces: NodeJS.CallSite[]): any;
    stackTraceLimit: number;
};
export declare const InteractionStatus: {
    Startup: string;
    Login: string;
    Logout: string;
    AcquireToken: string;
    SsoSilent: string;
    HandleRedirect: string;
    None: string;
};
export declare const EventType: {
    LOGIN_START: string;
    LOGIN_SUCCESS: string;
    LOGIN_FAILURE: string;
    ACQUIRE_TOKEN_START: string;
    ACQUIRE_TOKEN_SUCCESS: string;
    ACQUIRE_TOKEN_FAILURE: string;
    LOGOUT_START: string;
    LOGOUT_END: string;
    HANDLE_REDIRECT_START: string;
    ACQUIRE_TOKEN_NETWORK_START: string;
    SSO_SILENT_START: string;
    SSO_SILENT_SUCCESS: string;
    SSO_SILENT_FAILURE: string;
    POPUP_OPENED: string;
    POPUP_CLOSED: string;
    POPUP_BLOCKED: string;
    POPUP_TIMEOUT: string;
    REDIRECT_START: string;
    REDIRECT_END: string;
    ACQUIRE_TOKEN_BY_CODE_START: string;
    ACQUIRE_TOKEN_BY_CODE_SUCCESS: string;
    ACQUIRE_TOKEN_BY_CODE_FAILURE: string;
    LOGOUT_SUCCESS: string;
    LOGOUT_FAILURE: string;
    ACQUIRE_TOKEN_NETWORK_END: string;
};
export declare const EventMessageUtils: {
    getInteractionStatusFromEvent: import("vitest").Mock<(...args: any[]) => any>;
    getEventType: import("vitest").Mock<(...args: any[]) => any>;
};
export declare const EventError: {
    createNoWindowObjectError: import("vitest").Mock<(...args: any[]) => any>;
};
export declare const UrlString: {
    getHash: import("vitest").Mock<(...args: any[]) => any>;
    getDeserializedHash: import("vitest").Mock<(...args: any[]) => any>;
};
