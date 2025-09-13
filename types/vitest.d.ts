declare module 'vitest' {
  // Jest extension methods
  interface ExpectStatic {
    extend(matchers: Record<string, Function>): void;
  }

  // Mock functions
  interface Mock<T extends Function = Function> {
    (...args: any[]): any;
    mock: MockContext<T>;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): void;
    mockImplementation(fn: T): this;
    mockImplementationOnce(fn: T): this;
    mockReturnThis(): this;
    mockReturnValue(value: any): this;
    mockReturnValueOnce(value: any): this;
    mockResolvedValue(value: any): this;
    mockResolvedValueOnce(value: any): this;
    mockRejectedValue(value: any): this;
    mockRejectedValueOnce(value: any): this;
  }

  interface MockContext<T extends Function> {
    calls: any[][];
    instances: any[];
    invocationCallOrder: number[];
    results: Array<{ type: 'return' | 'throw' | 'incomplete'; value: any }>;
  }

  // Vi object
  interface Vi {
    fn<T extends Function = Function>(fn?: T): Mock<T>;
    spyOn<T>(object: T, method: keyof T): Mock<T[keyof T]>;
    clearAllMocks(): void;
    resetAllMocks(): void;
    restoreAllMocks(): void;
    resetModules(): void;
    useFakeTimers(): void;
    useRealTimers(): void;
    runAllTimers(): void;
    runOnlyPendingTimers(): void;
    advanceTimersByTime(ms: number): void;
    hoisted<T>(fn: () => T): T;
    stubEnv(name: string, value: string): void;
    importActual<T>(moduleName: string): Promise<T>;
    mock: {
      (moduleName: string, factory?: () => any): void;
    };
  }

  // Main vitest exports
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void | Promise<void>) => void;
  export const test: (name: string, fn: () => void | Promise<void>) => void;
  export const expect: ExpectStatic;
  export const vi: Vi;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
  export const jest: typeof vi;
}