import { LogLevel } from '@azure/msal-browser';
export declare const getAuthToken: (forceRefresh?: boolean) => Promise<string | null>;
declare module '@azure/msal-browser' {
    interface LoggerOptions {
        logLevel: LogLevel;
        loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => void;
    }
}
interface RequestOptions extends Omit<RequestInit, 'headers' | 'body'> {
    headers?: HeadersInit | Record<string, string | string[] | undefined> & {
        'Content-Type'?: string;
    };
    body?: BodyInit | Record<string, unknown> | null;
    onUploadProgress?: (progressEvent: ProgressEvent<EventTarget> & {
        lengthComputable: boolean;
        loaded: number;
        total: number;
    }) => void;
}
export declare const authFetch: <T = unknown>(url: string, options?: RequestOptions) => Promise<T>;
interface ApiClient {
    get: <T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'body' | 'method'>) => Promise<T>;
    post: <T = unknown, D = unknown>(endpoint: string, data?: D, options?: Omit<RequestOptions, 'body' | 'method'>) => Promise<T>;
    put: <T = unknown, D = unknown>(endpoint: string, data?: D, options?: Omit<RequestOptions, 'body' | 'method'>) => Promise<T>;
    delete: <T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'body' | 'method'>) => Promise<T>;
}
export declare const api: ApiClient;
export {};
