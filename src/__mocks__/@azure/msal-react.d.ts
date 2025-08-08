export declare const mockMsalInstance: {
    loginPopup: import("vitest").Mock<(...args: any[]) => any>;
    logout: import("vitest").Mock<(...args: any[]) => any>;
    getAllAccounts: import("vitest").Mock<(...args: any[]) => any>;
    acquireTokenSilent: import("vitest").Mock<(...args: any[]) => any>;
    setActiveAccount: import("vitest").Mock<(...args: any[]) => any>;
    handleRedirectPromise: import("vitest").Mock<(...args: any[]) => any>;
    addEventCallback: import("vitest").Mock<(...args: any[]) => any>;
    removeEventCallback: import("vitest").Mock<(...args: any[]) => any>;
};
export declare const MsalProvider: ({ children }: {
    children: any;
}) => any;
export declare const useMsal: import("vitest").Mock<() => {
    instance: {
        initialize: import("vitest").Mock<(...args: any[]) => any>;
        getAllAccounts: import("vitest").Mock<(...args: any[]) => any>;
        handleRedirectPromise: import("vitest").Mock<(...args: any[]) => any>;
        addEventCallback: import("vitest").Mock<(...args: any[]) => any>;
        removeEventCallback: import("vitest").Mock<(...args: any[]) => any>;
        loginPopup: import("vitest").Mock<(...args: any[]) => any>;
        logout: import("vitest").Mock<(...args: any[]) => any>;
        acquireTokenSilent: import("vitest").Mock<(...args: any[]) => any>;
        setActiveAccount: import("vitest").Mock<(...args: any[]) => any>;
    };
    accounts: any;
    inProgress: string;
}>;
