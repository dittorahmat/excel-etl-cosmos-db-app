import { AccountInfo } from '@azure/msal-browser';
export interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    loading: boolean;
    error: Error | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
}
export declare const AuthContext: import("react").Context<AuthContextType | undefined>;
export interface AuthProviderProps {
    children: React.ReactNode;
}
