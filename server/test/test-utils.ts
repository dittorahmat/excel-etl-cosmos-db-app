import { ContainerClient } from '@azure/storage-blob';
import { Container } from '@azure/cosmos';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// Vitest globals (vi, describe, it, expect, etc.) are available automatically in test files
// TypeScript types for test utilities
interface Mock<T = any, Y extends any[] = any> {
  (...args: Y): T;
  mock: {
    calls: Y[];
    results: Array<{ type: 'return' | 'throw'; value: T }>;
    instances: any[];
    implementation?: (...args: Y) => T;
  };
  mockImplementation: (fn: (...args: Y) => T) => Mock<T, Y>;
  mockImplementationOnce: (fn: (...args: Y) => T) => Mock<T, Y>;
  mockReturnValue: (value: T) => Mock<T, Y>;
  mockResolvedValue: (value: T) => Mock<Promise<T>, Y>;
  mockRejectedValue: (value: any) => Mock<Promise<T>, Y>;
  mockReturnValueOnce: (value: T) => Mock<T, Y>;
  mockResolvedValueOnce: (value: T) => Mock<Promise<T>, Y>;
  mockRejectedValueOnce: (value: any) => Mock<Promise<T>, Y>;
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
  mockReturnThis: () => Mock<T, Y>;
  mockName: (name: string) => Mock<T, Y>;
  getMockName: () => string;
  mockCallCount: number;
  mockResults: Array<{ type: 'return' | 'throw'; value: T }>;
}

// Mock the crypto module
vi.mock('crypto', () => {
  // Create a mock hash function that can be chained
  const createMockHash = (algorithm?: string) => {
    let data: string | Buffer = '';
    
    const mockHash = {
      update: vi.fn().mockImplementation(function(this: any, chunk: string | Buffer, inputEncoding?: string) {
        // Convert chunk to string if it's a Buffer
        let chunkStr: string;
        if (Buffer.isBuffer(chunk)) {
          chunkStr = chunk.toString('utf8');
        } else if (typeof chunk === 'string') {
          chunkStr = inputEncoding ? Buffer.from(chunk, inputEncoding as BufferEncoding).toString('utf8') : chunk;
        } else {
          chunkStr = String(chunk);
        }
        data += chunkStr;
        return this; // Return this for chaining
      }),
      digest: vi.fn().mockImplementation(function(this: any, encoding: string = 'hex') {
        // Return a predictable hash based on the input data and algorithm
        const hash = `mocked-${algorithm || 'hash'}-${data}`;
        return encoding === 'hex' ? hash : Buffer.from(hash);
      })
    };
    
    // Ensure methods return the mockHash object for chaining
    mockHash.update.mockReturnValue(mockHash);
    return mockHash;
  };

  const actualCrypto = vi.importActual('crypto');

  return {
    ...actualCrypto,
    randomBytes: vi.fn().mockImplementation((size: number) => {
      // Return a predictable buffer for testing
      return Buffer.alloc(size, 'a');
    }),
    createHash: vi.fn().mockImplementation((algorithm: string) => {
      const mock = createMockHash(algorithm);
      // Special handling for sha256 used in hashApiKey
      if (algorithm === 'sha256') {
        mock.digest = vi.fn().mockImplementation(function(this: any, encoding: string = 'hex') {
          // For sha256, return a predictable hash based on the input
          const data = this.update.mock.calls
            .map(([chunk]: [string | Buffer]) => 
              Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)
            )
            .join('');
          return `hashed-${data}`;
        });
      }
      return mock;
    }),
    timingSafeEqual: vi.fn().mockImplementation((a: Buffer, b: Buffer) => {
      if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
      if (a.length !== b.length) return false;
      return a.equals(b);
    })
  };
});

export interface MockFile extends Express.Multer.File {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  stream: any; // Not optional, required by File
  destination: string;
  filename: string;
  path: string;
  [key: string]: any;
}

export const mockFile: MockFile = {
  fieldname: 'file',
  originalname: 'test.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('test'),
  size: 1024,
  destination: '',
  filename: 'test.xlsx',
  path: '',
  stream: null,
};

export const mockContainerClient = {
  createIfNotExists: vi.fn().mockResolvedValue({}),
  getBlockBlobClient: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({}),
    deleteIfExists: vi.fn().mockResolvedValue({}),
    url: 'https://test.blob.core.windows.net/container/test.xlsx',
  }),
} as unknown as ContainerClient;

interface Resource {
  id: string;
  [key: string]: any;
}

// Mock CosmosDB container with proper chaining support
export const createMockCosmosContainer = <T extends Resource = Resource>(initialResources: T[] = []) => {
  let resources = [...initialResources];
  
  const mockItems = {
    query: vi.fn().mockImplementation((query: { query: string; parameters?: any[] }) => ({
      fetchAll: vi.fn().mockImplementation(() => {
        // Simple query matching - in a real test, you'd want to implement proper query parsing
        if (query.query.includes('WHERE')) {
          const idMatch = query.query.match(/c\.id = @id/);
          if (idMatch && query.parameters) {
            const idParam = query.parameters.find((p: any) => p.name === '@id');
            if (idParam) {
              const resource = initialResources.find((r: any) => r.id === idParam.value);
              return Promise.resolve({ resources: resource ? [resource] : [] });
            }
          }
        }
        return Promise.resolve({ resources: [...initialResources] });
      }),
    })),
    create: vi.fn().mockImplementation((item: T) => {
      const newItem = { 
        ...item, 
        id: item.id || `mock-id-${Math.random().toString(36).substr(2, 9)}`,
        _etag: `mock-etag-${Math.random().toString(36).substr(2, 9)}`,
        _ts: Math.floor(Date.now() / 1000)
      };
      resources.push(newItem);
      return { resource: newItem };
    }),
    upsert: vi.fn().mockImplementation((item: T) => {
      const existingIndex = resources.findIndex(i => i.id === item.id);
      const updatedItem = { 
        ...item, 
        _etag: `mock-etag-${Math.random().toString(36).substr(2, 9)}`,
        _ts: Math.floor(Date.now() / 1000)
      };
      
      if (existingIndex >= 0) {
        resources[existingIndex] = updatedItem;
      } else {
        resources.push(updatedItem);
      }
      
      return { resource: updatedItem };
    })
  };

  // Add fetchAll directly to items for backward compatibility
  (mockItems as any).fetchAll = vi.fn().mockResolvedValue({ resources });
  
  return {
    items: mockItems,
    item: vi.fn().mockImplementation((id: string, partitionKey: string) => {
      const item = resources.find((i: any) => i.id === id);
      return {
        read: vi.fn().mockResolvedValue({ resource: item || null }),
        replace: vi.fn().mockImplementation((newItem: T) => {
          const index = resources.findIndex((i: any) => i.id === id);
          if (index >= 0) {
            resources[index] = { ...newItem as any, id };
            return { resource: resources[index] };
          }
          return { resource: null };
        }),
        delete: vi.fn().mockImplementation(() => {
          const index = resources.findIndex((i: any) => i.id === id);
          if (index >= 0) {
            resources.splice(index, 1);
            return { statusCode: 204 };
          }
          return { statusCode: 404 };
        })
      };
    })
  };
};

// Create a typed mock container
export const mockCosmosContainer = createMockCosmosContainer() as unknown as Container;

export interface MockRequest extends Omit<Request, 'body' | 'params' | 'query' | 'headers'> {
  file?: Express.Multer.File;
  user?: { oid: string; name?: string; email?: string };
  body?: any;
  params?: Record<string, any>;
  query?: Record<string, any>;
  headers?: Record<string, any>;
  [key: string]: any;
}

export const mockRequest = (body: any = {}, file?: Express.Multer.File): MockRequest => {
  const req: Partial<Request> = {
    body,
    file,
    headers: {},
    params: {},
    query: {},
    get: vi.fn() as any, // Type assertion to handle the overloaded get method
    user: { oid: 'test-user-id' },
  };
  return req as MockRequest;
};

export type MockResponse = Response & {
  status: (code: number) => MockResponse;
  send: (body: any) => MockResponse;
  json: (body: any) => MockResponse;
  end: () => MockResponse;
  statusCode: number;
  body: any;
  locals: any;
  get: (field: string) => string | undefined;
  set: (field: string, value: string) => void;
  header: (field: string, value: string) => void;
  setHeader: (name: string, value: string) => void;
  getHeader: (name: string) => string | string[] | undefined;
  [key: string]: any;
};

export const mockResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as MockResponse;
};

// Create a mock next function with proper typing
export const mockNext: NextFunction = vi.fn() as NextFunction;
