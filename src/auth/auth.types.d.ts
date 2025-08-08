export interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
    error: Error | null;
    loading: boolean;
}
export interface AuthProviderProps {
    children: ReactNode;
}
