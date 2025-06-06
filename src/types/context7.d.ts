declare module '@upstash/context7-mcp' {
  export interface Context7QueryOptions {
    query: string;
    context?: {
      headers?: Record<string, string>;
      [key: string]: any;
    };
  }

  export class Context7Client {
    constructor(config?: any);
    query(options: Context7QueryOptions): Promise<any>;
  }
}
