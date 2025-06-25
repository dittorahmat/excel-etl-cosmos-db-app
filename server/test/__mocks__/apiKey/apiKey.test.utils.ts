import type { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';
import type { ApiKey } from './apiKey.test.types.js';

// Extended Request type for testing
// Extended Request type for testing
export interface TestRequest extends Request {
  user?: any;
  apiKey?: any;
  ip: string;
  get(name: 'set-cookie'): string[] | undefined;
  get(name: string): string | undefined;
  // Add other custom properties used in tests
  [key: string]: any;
}

/**
 * Creates a test API key with the provided overrides
 * @param overrides - Optional partial API key properties to override defaults
 * @returns A complete ApiKey object with test data
 */
export const createTestApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => ({
  id: `test-${Math.random().toString(36).substring(2, 9)}`,
  name: 'Test API Key',
  key: `valid-test-key-${Math.random().toString(36).substring(2, 10)}`,
  keyHash: `hashed-${Math.random().toString(36).substring(2, 10)}`,
  userId: 'test-user-id',
  lastUsedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  _rid: '',
  _self: '',
  _etag: '',
  _attachments: '',
  _ts: Math.floor(Date.now() / 1000),
  ...overrides
});

/**
 * A test API key with all required properties
 * Can be used as a default test fixture
 */
export const testApiKey: ApiKey = {
  id: 'test-api-key-id',
  name: 'test-key',
  userId: 'test-user-id',
  keyHash: 'test-key-hash',
  key: 'test-api-key',
  lastUsedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true,
  _rid: '',
  _self: '',
  _etag: '',
  _attachments: '',
  _ts: 0
} as const;

/**
 * Creates a mock request object for testing
 * @param headers - Optional headers to include in the request
 * @returns A mock TestRequest object with the specified headers
 */
export const createMockRequest = (headers: Record<string, string> = {}): TestRequest => {
  const request: Partial<TestRequest> = {
    headers,
    method: 'GET',
    url: '/test',
    query: {},
    body: {},
    // Use type assertion to handle the overloaded get method
    get: ((name: string) => {
      if (name.toLowerCase() === 'set-cookie') {
        return [];
      }
      return headers[name.toLowerCase()];
    }) as { (name: 'set-cookie'): string[] | undefined; (name: string): string | undefined },
    // Add other required request properties with proper types
    cookies: {},
    signedCookies: {},
    accepts: vi.fn().mockReturnValue('application/json'),
    acceptsCharsets: vi.fn().mockReturnValue(['utf-8']),
    acceptsEncodings: vi.fn().mockReturnValue(['gzip', 'deflate']),
    acceptsLanguages: vi.fn().mockReturnValue(['en-US']),
    // Add other required properties with proper types
    params: {},
    protocol: 'http',
    secure: false,
    originalUrl: '/test',
    path: '/test',
    hostname: 'localhost',
    xhr: false,
    // Add mock implementations for other required methods
    range: vi.fn(),
    header: vi.fn((name: string) => headers[name.toLowerCase()]),
    is: vi.fn().mockReturnValue(false),
    param: vi.fn().mockReturnValue('')
  } as unknown as TestRequest;
  
  // Ensure required properties are set
  request.ip = headers['x-forwarded-for'] || '127.0.0.1';
  
  return request as TestRequest;
};

/**
 * Creates a mock response object for testing
 * @returns A mock Response object with common methods
 */
export const createMockResponse = (): Response => {
  const res = {} as Response;
  const json = vi.fn().mockReturnValue(res);
  const status = vi.fn().mockReturnValue({ json });
  
  res.status = status;
  res.json = json;
  res.send = vi.fn().mockReturnValue(res);
  res.sendStatus = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.render = vi.fn().mockReturnValue(res);
  res.sendFile = vi.fn().mockReturnValue(res);
  res.download = vi.fn().mockReturnValue(res);
  
  return res;
};

/**
 * Creates a mock next function for testing
 * @returns A mock NextFunction
 */
export const createNextFunction = (): NextFunction => vi.fn();
