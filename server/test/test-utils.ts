import { ContainerClient } from '@azure/storage-blob';
import { Container } from '@azure/cosmos';
import type { Mock } from 'vitest';
import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

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

// Mock CosmosDB container with proper chaining support
export const createMockCosmosContainer = (initialResources: any[] = []) => {
  let resources = [...initialResources];
  
  const mockItems = {
    query: vi.fn().mockImplementation((query) => {
      const queryResult = {
        fetchAll: vi.fn().mockResolvedValue({
          resources: query?.parameters?.length 
            ? resources.filter(item => 
                query.parameters.some((param: any) => 
                  item[param.name] === param.value ||
                  item.id === param.value ||
                  item.userId === param.value
                )
              )
            : resources
        })
      };
      queryResult.fetchAll.mockName('fetchAll');
      return queryResult;
    }),
    create: vi.fn().mockImplementation((item) => {
      const newItem = { 
        ...item, 
        id: item.id || `mock-id-${Math.random().toString(36).substr(2, 9)}`,
        _etag: `mock-etag-${Math.random().toString(36).substr(2, 9)}`,
        _ts: Math.floor(Date.now() / 1000)
      };
      resources.push(newItem);
      return { resource: newItem };
    }),
    upsert: vi.fn().mockImplementation((item) => {
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
    item: vi.fn().mockImplementation((id, partitionKey) => {
      const item = resources.find(i => i.id === id);
      return {
        read: vi.fn().mockResolvedValue({ resource: item || null }),
        replace: vi.fn().mockImplementation((newItem) => {
          const index = resources.findIndex(i => i.id === id);
          if (index >= 0) {
            resources[index] = { ...newItem, id };
            return { resource: resources[index] };
          }
          return { resource: null };
        }),
        delete: vi.fn().mockImplementation(() => {
          const index = resources.findIndex(i => i.id === id);
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

export interface MockRequest extends Partial<Request> {
  file?: Express.Multer.File;
  user?: { oid: string; name?: string; email?: string };
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

export interface MockResponse extends Partial<Response> {
  status?: (code: number) => Response;
  sendStatus?: (code: number) => Response;
  send?: (body: any) => Response;
  json?: (body: any) => Response;
  end?: () => Response;
  [key: string]: any;
}

export const mockResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as MockResponse;
};

export const mockNext: NextFunction = vi.fn();
