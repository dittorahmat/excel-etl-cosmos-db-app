import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, type Mock } from 'vitest';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Container, CosmosClient } from '@azure/cosmos';
import { apiKeyAuth } from '../src/middleware/apiKeyAuth.js';

// Define local types to avoid import issues
type AzureCosmosDB = {
  client: CosmosClient;
  databaseId: string;
  containerId: string;
  partitionKey: string;
  cosmosClient: CosmosClient;
  database: any; // Mock database object
  container: any; // Mock container object
  
  // Methods
  upsertRecord: (record: any) => Promise<any>;
  getRecord: (id: string, partitionKey: string) => Promise<any>;
  queryRecords: (query: string, parameters?: any[]) => Promise<any[]>;
  deleteRecord: (id: string, partitionKey: string) => Promise<void>;
  
  // Additional methods from the actual interface
  query: (query: string, parameters?: any[]) => Promise<any[]>;
  getById: (id: string, partitionKey?: string) => Promise<any>;
};

// Define the types locally to avoid import issues
interface ApiKey {
  id: string;
  name: string;
  userId: string;
  keyHash: string;
  key?: string; // Add key property for testing
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  _rid?: string;
  _self?: string;
  _etag?: string;
  _attachments?: string;
  _ts?: number;
  [key: string]: any; // Allow additional properties for flexibility
}

// Define the API key validation types
interface ValidateApiKeyParams {
  key: string;
  ipAddress?: string;
}

interface ValidateApiKeyResult {
  isValid: boolean;
  key: ApiKey | null;
  error?: string;
}

// Create a test API key with proper typing
const createTestApiKey = (overrides: Partial<ApiKey> = {}): ApiKey => ({
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

// Create a test API key with all required properties
const testApiKey: ApiKey = {
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

// Create a mock request object with proper typing
const createMockRequest = (headers: Record<string, string> = {}) => {
  // Create a proxy to handle the get method with proper typing
  const request = {
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
    }) as { (name: 'set-cookie'): string[] | undefined; (name: string): string | undefined }, // Type assertion for overloaded method
    // Add other required request properties with proper types
    cookies: {},
    signedCookies: {},
    accepts: vi.fn().mockReturnValue('application/json'),
    acceptsCharsets: vi.fn().mockReturnValue(['utf-8']),
    acceptsEncodings: vi.fn().mockReturnValue(['gzip', 'deflate']),
    acceptsLanguages: vi.fn().mockReturnValue(['en-US']),
    app: {
      get: vi.fn(),
      set: vi.fn(),
      enable: vi.fn(),
      enabled: vi.fn(),
      disable: vi.fn(),
      disabled: vi.fn(),
      use: vi.fn()
    } as any,
    baseUrl: '',
    fresh: true,
    hostname: 'localhost',
    ip: '127.0.0.1',
    ips: [],
    originalUrl: '/test',
    path: '/test',
    protocol: 'http',
    route: {},
    secure: false,
    stale: false,
    subdomains: [],
    xhr: false
  } as unknown as Request;
};

// Create a mock response object with proper typing
const createMockResponse = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    contentType: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnThis(),
    get: vi.fn(),
    links: vi.fn().mockReturnThis(),
    location: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
    sendFile: vi.fn().mockReturnThis(),
    sendfile: vi.fn().mockReturnThis(),
    download: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    vary: vi.fn().mockReturnThis(),
    // Add other Express response methods as needed
  };
  return res as unknown as Response;
};

// Create a mock next function
const createNextFunction = () => vi.fn() as NextFunction;

// Create a mock validateApiKey function with proper typing
const mockValidateApiKey = vi.fn()
  .mockImplementation(() => Promise.resolve({ isValid: true, key: testApiKey }))
  .mockName('validateApiKey') as unknown as {
    (params: ValidateApiKeyParams): Promise<ValidateApiKeyResult>;
    mockResolvedValue: (value: ValidateApiKeyResult) => void;
    mockResolvedValueOnce: (value: ValidateApiKeyResult) => void;
    mockRejectedValue: (error: Error) => void;
    mockRejectedValueOnce: (error: Error) => void;
    mockImplementation: (impl: (params: ValidateApiKeyParams) => Promise<ValidateApiKeyResult>) => void;
  };

// Mock the API key repository
const mockApiKeyRepository = {
  validateApiKey: vi.fn().mockResolvedValue({
    isValid: true,
    key: testApiKey
  } as ValidateApiKeyResult),
  findById: vi.fn().mockResolvedValue(testApiKey),
  findByKeyHash: vi.fn().mockResolvedValue(testApiKey),
  create: vi.fn().mockResolvedValue(testApiKey),
  update: vi.fn().mockResolvedValue(testApiKey),
  delete: vi.fn().mockResolvedValue(true)
};

// Mock the API key repository module
vi.mock('../../src/repositories/apiKeyRepository.js', () => ({
  ApiKeyRepository: vi.fn().mockImplementation(() => mockApiKeyRepository)
}));

// Mock the Azure Cosmos DB client with proper typing
const createMockCosmosMocks = () => {
  const mockItems = {
    upsert: vi.fn().mockResolvedValue({ resource: {} }),
    query: vi.fn().mockResolvedValue({ resources: [] }),
    delete: vi.fn().mockResolvedValue(undefined)
  };

  const mockContainer = {
    items: mockItems,
    item: vi.fn().mockImplementation((id: string) => ({
      read: vi.fn().mockResolvedValue({ resource: {} }),
      delete: vi.fn().mockResolvedValue(undefined)
    }))
  };

  const mockDatabase = {
    container: vi.fn().mockReturnValue(mockContainer)
  };

  const mockCosmosClient = {
    database: vi.fn().mockReturnValue(mockDatabase),
    databases: {
      createIfNotExists: vi.fn().mockResolvedValue({ database: mockDatabase })
    }
  } as unknown as CosmosClient;

  return { mockItems, mockContainer, mockDatabase, mockCosmosClient };
};
const { mockItems, mockContainer, mockDatabase, mockCosmosClient } = createMockCosmosMocks();

// Create a properly typed mock AzureCosmosDB implementation
const createMockAzureCosmosDB = (): AzureCosmosDB => {
  const containerImpl = vi.fn().mockImplementation((containerName: string, partitionKey: string) => {
    const mockItems = {
      query: vi.fn().mockResolvedValue({ resources: [] }),
      readAll: vi.fn().mockResolvedValue({ resources: [] }),
      create: vi.fn().mockResolvedValue({ resource: {} }),
      upsert: vi.fn().mockResolvedValue({ resource: {} }),
      delete: vi.fn().mockResolvedValue(undefined)
    };

    const mockContainer = {
      id: containerName,
      database: mockDatabase,
      items: mockItems,
      item: vi.fn().mockImplementation((id: string) => ({
        read: vi.fn().mockResolvedValue({ resource: {} }),
        delete: vi.fn().mockResolvedValue(undefined),
        replace: vi.fn().mockResolvedValue({ resource: {} })
      })),
      read: vi.fn().mockResolvedValue({
        resource: {
          id: containerName,
          partitionKey: { paths: [partitionKey] }
        },
        container: {},
        statusCode: 200,
        requestCharge: 1
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      readOffer: vi.fn().mockResolvedValue({ resource: {} }),
      readPartitionKeyRanges: vi.fn().mockResolvedValue({ resources: [] }),
      getQueryPlan: vi.fn().mockResolvedValue({})
    };

    return Promise.resolve(mockContainer as unknown as Container);
  });

  return {
    client: mockCosmosClient,
    databaseId: 'test-db',
    containerId: 'test-container',
    partitionKey: '/id',
    cosmosClient: mockCosmosClient,
    database: mockDatabase,
    container: containerImpl as any, // Type assertion to handle the mock implementation
    upsertRecord: vi.fn().mockResolvedValue({ resource: {} }),
    getRecord: vi.fn().mockResolvedValue({ resource: {} }),
    queryRecords: vi.fn().mockResolvedValue([]),
    deleteRecord: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue({ resource: {} })
  };
};

// Create the mock instance
const mockAzureCosmosDB = createMockAzureCosmosDB();

// Create mock request/response/next function helpers
const createTestMocks = () => {
  // Use the existing createMockRequest and createMockResponse helpers
  const req = createMockRequest();
  const res = createMockResponse();
  const next = createNextFunction();
  
  return { req, res, next };
};

// Helper to create a test middleware instance
const createTestMiddleware = () => {
  return apiKeyAuth(mockAzureCosmosDB);
};

// Types
type ApiKeyAuthMiddleware = (options?: any) => RequestHandler;

// Extended Request type for testing
interface TestRequest extends Omit<Partial<Request>, 'get'> {
  user?: any;
  apiKey?: any;
  ip?: string;
  get(name: string): string | string[] | undefined;
  [key: string]: any; // Allow additional properties
}

describe('API Key Authentication Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let nextFn: jest.Mock;
  let middleware: RequestHandler;

  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementation for validateApiKey
    (mockValidateApiKey as any).mockImplementation(async (params: ValidateApiKeyParams): Promise<ValidateApiKeyResult> => {
      if (params.key === 'invalid-key') {
        return {
          isValid: false,
          key: null,
          error: 'Invalid API key'
        };
      }
      
      return {
        isValid: true,
        key: {
          ...testApiKey,
          id: 'test-api-key-id',
          userId: 'test-user-id',
          keyHash: 'test-key-hash',
          name: 'test-key',
          key: params.key || 'test-api-key-value',
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        }
      };
    });
    
    // Create a fresh middleware instance for each test
    middleware = createTestMiddleware();
    
    // Setup default request
    mockReq = {
      headers: {},
      query: {},
      body: {},
      method: 'GET',
      url: '/test',
      params: {},
      cookies: {},
      signedCookies: {},
      accepts: vi.fn(),
      acceptsCharsets: vi.fn(),
      acceptsEncodings: vi.fn(),
      acceptsLanguages: vi.fn(),
      app: {},
      baseUrl: '',
      fresh: true,
      hostname: 'localhost',
      originalUrl: '/test',
      path: '/test',
      protocol: 'http',
      route: {},
      secure: false,
      stale: false,
      subdomains: [],
      xhr: false,
      get: vi.fn().mockImplementation((name: string): string | string[] | undefined => {
        const headers: Record<string, string> = {
          'x-forwarded-for': '127.0.0.1',
          'authorization': 'Bearer test-api-key',
          'x-api-key': 'test-api-key'
        };
        return headers[name.toLowerCase()];
      }),
      ip: '127.0.0.1',
      user: undefined
    } as unknown as Request;
    
    // Setup default response
    mockRes = createMockResponse();
    
    // Setup default next function
    nextFn = vi.fn();
  });

  describe('apiKeyAuth', () => {
    it('should call next() with error if API key is invalid', async () => {
      // Arrange
      const apiKey = 'invalid-key';
      
      // Create request object with proper typing
      const req = {
        headers: { 'authorization': `ApiKey ${apiKey}` },
        query: {},
        // Don't set user to test API key validation
        user: undefined,
        ip: '127.0.0.1',
        get: (name: string): string | string[] | undefined => {
          const headers: Record<string, string> = {
            'x-forwarded-for': '127.0.0.1',
            'authorization': `ApiKey ${apiKey}`
          };
          return headers[name.toLowerCase()];
        }
      } as unknown as Request;

      // Setup mock response with proper typing
      const mockRes = createMockResponse();

      // Mock the validateApiKey function to return invalid
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: false,
        key: null
      } as ValidateApiKeyResult);

      const next = vi.fn() as NextFunction;

      // Act
      await apiKeyAuth(mockAzureCosmosDB)(req, mockRes, next);

      // Assert
      expect(mockValidateApiKey).toHaveBeenCalledTimes(1);
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: apiKey,
        ipAddress: '127.0.0.1'
      });
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Forbidden',
        message: 'Invalid or expired API key',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() with error if API key is missing', async () => {
      // Arrange - no API key in headers
      const req = {
        headers: {
          'x-api-key': 'test-api-key'
        },
        query: {},
        body: {},
        method: 'GET',
        url: '/test',
        params: {},
        cookies: {},
        signedCookies: {},
        accepts: vi.fn(),
        acceptsCharsets: vi.fn(),
        acceptsEncodings: vi.fn(),
        acceptsLanguages: vi.fn(),
        app: {},
        baseUrl: '',
        fresh: true,
        hostname: 'localhost',
        originalUrl: '/test',
        path: '/test',
        protocol: 'http',
        route: {},
        secure: false,
        stale: false,
        subdomains: [],
        xhr: false
      } as unknown as Request;

      // Setup mock response
      const mockRes = createMockResponse();

      const next = vi.fn() as NextFunction;

      // Act
      await apiKeyAuth(mockAzureCosmosDB)(req, mockRes, next);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'API key is required',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate API key from Authorization header', async () => {
      // Arrange
      const apiKey = 'test-api-key';
      const testApiKey: ApiKey = {
        id: 'key-123',
        name: 'Test Key',
        key: apiKey,
        keyHash: 'hashed-test-key',
        userId: 'user-123',
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      const req: Request = {
        headers: { 'authorization': `ApiKey ${apiKey}` },
        query: {},
        // Don't set user to test API key validation
        user: undefined,
        ip: '127.0.0.1',
        get: (name: string): string | string[] | undefined => {
          const headers: Record<string, string> = {
            'x-forwarded-for': '127.0.0.1',
            'authorization': `ApiKey ${apiKey}`
          };
          return headers[name.toLowerCase()];
        },
        // Add other required properties with appropriate types
        method: 'GET',
        url: '/test',
        params: {},
        body: {},
        cookies: {},
        signedCookies: {},
        route: {},
        protocol: 'http',
        secure: false,
        originalUrl: '/test',
        path: '/test',
        hostname: 'localhost',
        // Add type assertion to handle the dynamic nature of the Request type
      } as unknown as Request;

      // Setup mock response
      const mockRes = createMockResponse();

      // Mock the validateApiKey function
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: true,
        key: createTestApiKey({
          id: 'test-key',
          name: 'Test Key',
          userId: 'user-123',
          keyHash: 'hashed-test-api-key-value'
        })
      });

      const next = vi.fn() as NextFunction;

      // Act
      await apiKeyAuth(mockAzureCosmosDB)(req, mockRes, next);

      // Assert
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: apiKey,
        ipAddress: '127.0.0.1'
      });
      expect(next).toHaveBeenCalled();
      expect(req.apiKey).toEqual(expect.objectContaining({
        id: 'test-key',
        name: 'Test Key'
      }));
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid API key', async () => {
      // Arrange
      const req = {
        headers: { 'authorization': 'ApiKey invalid-key' },
        query: {},
        // Don't set user to test API key validation
        user: undefined,
        ip: '127.0.0.1'
      } as unknown as Request;

      mockValidateApiKey.mockResolvedValue({ 
        isValid: false, 
        key: null 
      } as ValidateApiKeyResult);

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      const middleware = apiKeyAuth(mockAzureCosmosDB);

      // Act
      await new Promise<void>((resolve) => {
        middleware(req, res, (err) => {
          // Assert
          expect(err).toBeDefined();
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe('Invalid or expired API key');
          resolve();
        });
      });
      
      // Verify the repository was called with the correct parameters
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: 'invalid-key',
        ipAddress: '127.0.0.1'
      });
    });

    it('should attach apiKey to request on successful authentication', async () => {
      // Arrange
      const apiKey = 'test-api-key-value';
      const req = {
        headers: { 'authorization': `ApiKey ${apiKey}` },
        query: {},
        // Don't set user to test API key validation
        user: undefined,
        ip: '127.0.0.1',
        get: (name: string) => {
          const headers: Record<string, string> = {
            'x-forwarded-for': '127.0.0.1',
            'authorization': `ApiKey ${apiKey}`
          };
          return headers[name.toLowerCase()];
        }
      } as unknown as Request;

      // Setup mock response
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response;

      // Mock the validateApiKey function
      mockValidateApiKey.mockResolvedValueOnce({
        isValid: true,
        key: createTestApiKey({
          id: 'test-key',
          name: 'Test Key',
          userId: 'user-123',
          keyHash: 'hashed-test-api-key-value'
        })
      });

      // Act
      await apiKeyAuth(mockAzureCosmosDB)(req, mockRes, nextFn);

      // Assert
      expect(mockValidateApiKey).toHaveBeenCalledWith({
        key: apiKey,
        ipAddress: '127.0.0.1'
      });
      expect(req.apiKey).toEqual({ id: 'key-123', name: 'Test Key' });
      expect(nextFn).toHaveBeenCalled();
    });
  });
});
