// Type definitions for test files
/// <reference types="vitest/globals" />

// Extend Express types
declare namespace Express {
  interface NextFunction {
    mock: {
      calls: Array<Array<any>>;
      results: Array<{ type: string; value: any }>;
      instances: Array<any>;
      lastCall: Array<any> | null;
    };
    mockClear: () => void;
  }
}

// Extend Vitest types
declare module 'vitest' {
  interface MockInstance<T = any, P extends any[] = any> {
    mockImplementation: (fn: (...args: P) => T) => MockInstance<T, P>;
    mockResolvedValue: (value: T) => MockInstance<T, P>;
    mockRejectedValue: (value: any) => MockInstance<T, P>;
  }
}

// Declare modules for test files
declare module '*.js' {
  const content: any;
  export default content;
}

declare module '*.ts' {
  const content: any;
  export default content;
}
