type ApiResponse<T = unknown> = Response & {
    json(): Promise<T>;
};
export declare const getAuthToken: () => Promise<string | null>;
export declare const authFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<ApiResponse<T>>;
export declare const api: {
    get: <T = unknown>(endpoint: string, options?: RequestInit) => Promise<ApiResponse<T>>;
    post: <T = unknown, D = unknown>(endpoint: string, data?: D, options?: RequestInit) => Promise<ApiResponse<T>>;
    put: <T = unknown, D = unknown>(endpoint: string, data?: D, options?: RequestInit) => Promise<ApiResponse<T>>;
    delete: <T = unknown>(endpoint: string, options?: RequestInit) => Promise<ApiResponse<T>>;
};
export {};
