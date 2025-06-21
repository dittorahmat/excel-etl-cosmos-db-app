import { Context7Client } from '@upstash/context7-mcp';
export declare const context7Client: Context7Client;
export declare const useContext7WithAuth: () => {
    query: (query: string) => Promise<any>;
    isAuthenticated: boolean;
};
