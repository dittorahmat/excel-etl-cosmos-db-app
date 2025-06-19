import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { BlobServiceClient, BlockBlobUploadResponse } from '@azure/storage-blob';
import { CosmosClient, Container, Database } from '@azure/cosmos';
import { Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import express from 'express';
import multer from 'multer';

// Mock types
type MockFn = ReturnType<typeof vi.fn>;
type MockRequest = Partial<Request> & { user?: any; file?: any };
type MockResponse = Partial<Response> & { 
  json: MockFn; 
  status: MockFn;
  send: MockFn;
};

let mockCosmosDb = {
  ...mockCosmosClient,
  upsertRecord: vi.fn().mockResolvedValue({})
};

// These will be properly initialized in beforeEach
let mockContainerClient = mockBlobServiceClient.getContainerClient('test-container');
let mockCosmosContainer = mockCosmosClient.database('test-db').container('test-container');

// Mock the upload route
vi.mock('../src/routes/upload.route.js', () => ({
  router: {
    post: vi.fn(),
    get: vi.fn(),
    use: vi.fn()
  }
}));

// Mock the upload and upsert methods
const mockUploadFile = vi.fn().mockResolvedValue({});
const mockUpsertRecord = vi.fn().mockResolvedValue({});

beforeEach(() => {
  // Create mock blob storage
  const mockBlobClient: MockBlockBlobClient = {
    uploadData: vi.fn().mockResolvedValue({ requestId: 'mock-request-id' }),
    url: `https://mock.blob.core.windows.net/${testContainerName}/${testBlobName}`
  };

  mockContainerClient = {
    getBlockBlobClient: vi.fn().mockReturnValue(mockBlobClient),
    url: `https://mock.blob.core.windows.net/${testContainerName}`
  };

  mockBlobStorage = {
    getContainerClient: vi.fn().mockReturnValue(mockContainerClient)
  };

  // Create mock Cosmos DB
  mockCosmosContainer = {
    items: {
      create: vi.fn().mockImplementation((item) => Promise.resolve({ resource: item })),
      query: vi.fn().mockReturnValue({
        fetchAll: vi.fn().mockResolvedValue({ resources: [] })
      })
    }
  };

  const mockDatabase = {
    container: vi.fn().mockReturnValue(mockCosmosContainer)
  };

  mockCosmosDb = {
    database: vi.fn().mockReturnValue(mockDatabase)
  };

  // Create mock Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  return app;
};

  // Mock Azure services
  vi.mock('@azure/storage-blob', () => ({
    BlobServiceClient: {
      fromConnectionString: vi.fn().mockImplementation(() => mockBlobStorage)
    }
  }));

  vi.mock('@azure/cosmos', () => ({
    CosmosClient: vi.fn().mockImplementation(() => mockCosmosDb)
  }));

  // Reset all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  if (server) {
    server.close();
    server = null;
  }
});

// Mock request/response helpers
const mockRequest = (options: Partial<Request> = {}): MockRequest => {
  const headers = new Map<string, string | string[]>();
  headers.set('content-type', 'application/json');
  
  // Handle headers properly
  const requestHeaders: Record<string, any> = {
    ...Object.fromEntries(headers.entries()),
    ...options.headers
  };
  
  // Ensure set-cookie is an array
  if (!requestHeaders['set-cookie']) {
    requestHeaders['set-cookie'] = [];
  }
  
  return {
    ...options,
    headers: requestHeaders,
    body: options.body || {},
    file: options.file,
    user: options.user || { oid: 'test-user-123' },
  } as MockRequest;
};

const mockResponse = (): MockResponse => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.sendStatus = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res as MockResponse;
};

const mockNext = vi.fn();

// Simplified mock types
type MockFn = ReturnType<typeof vi.fn>;

// Simplified mock module type
type MockModule<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any 
    ? MockFn 
    : T[K] extends object 
      ? MockModule<T[K]>
      : T[K];
};

// Mock Express types
interface MockRequest extends Partial<Request> {
  file?: Express.Multer.File;
  user?: any;
  headers: Record<string, string>;
  body: Record<string, any>;
}

interface MockResponse extends Partial<Response> {
  status: MockFn;
  json: MockFn;
  send: MockFn;
  sendStatus: MockFn;
  setHeader: MockFn;
  end: MockFn;
}

// Azure service mocks
interface MockBlobServiceClient {
  getContainerClient: (name: string) => MockContainerClient;
}

interface MockContainerClient {
  getBlockBlobClient: (name: string) => MockBlockBlobClient;
  url: string;
}

interface MockBlockBlobClient {
  uploadData: (data: Buffer) => Promise<{ requestId: string }>;
  url: string;
}

interface MockCosmosClient {
  database: (name: string) => MockDatabase;
}

interface MockDatabase {
  container: (name: string) => MockContainer;
}

interface MockContainer {
  items: {
    create: (item: any) => Promise<{ resource: any }>;
    query: (query: any) => { fetchAll: () => Promise<{ resources: any[] }> };
  };
}

// Test data
const testUserId = 'test-user-123';
const testFileId = 'test-file-456';
const testContainerName = 'test-container';
const testBlobName = 'test-blob';
const testData = [
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
];

const mockFile = {
  fieldname: 'file',
  originalname: 'test.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('test file content'),
  size: 1024,
  stream: null as any,
  destination: '',
  filename: 'test.xlsx',
  path: '/tmp/test.xlsx'
} as Express.Multer.File;

const mockUploadResult = {
  url: 'https://test.blob.core.windows.net/container/test.xlsx',
  fileName: 'test.xlsx',
  containerName: 'test-container'
};

const mockProcessedData = [
  { id: '1', name: 'Test Item 1', value: 100 },
  { id: '2', name: 'Test Item 2', value: 200 }
];

// Mock Express app and response
const createMockApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

const createMockResponse = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  res.send = vi.fn().mockReturnThis();
  res.sendStatus = vi.fn().mockReturnThis();
  res.setHeader = vi.fn().mockReturnThis();
  res.end = vi.fn();
  return res as Express.Response;
};

// Mock XLSX
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    decode_range: vi.fn(),
    encode_cell: vi.fn(),
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid'),
}));

// Mock Azure services
vi.mock('../src/config/azure-services.js', () => ({
  initializeAzureServices: vi.fn(),
}));

// Mock file type for testing
interface MockFile extends Express.Multer.File {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// Helper function to create a mock file
const createMockFile = (): MockFile => ({
  buffer: Buffer.from('test'),
  originalname: 'test.xlsx',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size: 1024,
  stream: null as any,
  destination: '',
  filename: 'test.xlsx',
  path: '/tmp/test.xlsx',
  fieldname: 'file',
  encoding: '7bit',
});

describe('File Upload API', () => {
  // Test application and server
  let app: Express & { server?: Server };
  let server: Server;
  
  // Test data
  let testUserId: string;
  
  // Mock data
  let mockFile: MockFile;
  
  // Mock Azure Blob Storage
  let mockBlockBlobClient: {
    upload: MockFn<Promise<BlockBlobUploadResponse>>;
    deleteIfExists: MockFn<Promise<{ succeeded: boolean }>>;
  };
  
  let mockContainerClient: {
    getBlockBlobClient: MockFn<{ upload: MockFn<Promise<BlockBlobUploadResponse>> }>;
    url: string;
  };
  
  // Mock Azure Cosmos DB
  let mockCosmosContainer: {
    items: {
      query: MockFn<Promise<{ resources: any[] }>>;
      upsert: MockFn<Promise<any>>;
    };
  };
  
  // Mock Azure services
  let mockBlobStorage: {
    uploadFile: MockFn<Promise<string>>;
    blobServiceClient: {
      getContainerClient: MockFn<{
        getBlockBlobClient: MockFn<{ upload: MockFn<Promise<BlockBlobUploadResponse>> }>;
        url: string;
      }>;
    };
  };
  
  let mockCosmosDb: {
    container: {
      items: {
        query: MockFn<Promise<{ resources: any[] }>>;
        upsert: MockFn<Promise<any>>;
      };
    };
    upsertRecord: MockFn<Promise<any>>;
  };

  // Initialize test environment before each test
  beforeEach(() => {
    // Create a fresh Express app for each test
    app = createTestApp();
    
    // Initialize test data
    testUserId = 'test-user-id';
    
    // Initialize mock file
    mockFile = createMockFile();
    
    // Initialize Azure Blob Storage mocks
    const mockUpload = vi.fn().mockResolvedValue({});
    const mockBlockBlobClient = {
      upload: mockUpload,
      url: 'https://mock.blob.core.windows.net/container/blob'
    };

    const mockGetBlockBlobClient = vi.fn().mockReturnValue(mockBlockBlobClient);
    const mockGetContainerClient = vi.fn().mockReturnValue({
      getBlockBlobClient,
      url: 'https://mock.blob.core.windows.net/container'
    });

    const mockBlobServiceClient = {
      getContainerClient: mockGetContainerClient,
      uploadFile: vi.fn().mockResolvedValue('mock-file-url')
    };

    const mockQueryResult = {
      resources: [],
      fetchAll: vi.fn().mockResolvedValue({ resources: [] })
    };

    const mockItems = {
      query: vi.fn().mockReturnValue(mockQueryResult),
      create: vi.fn().mockResolvedValue({ resource: {} }),
      upsert: vi.fn().mockResolvedValue({ resource: {} })
    };

    const mockContainer = {
      items: mockItems
    };

    const mockDatabase = {
      container: vi.fn().mockReturnValue(mockContainer)
    };

    const mockCosmosClient = {
      database: vi.fn().mockReturnValue(mockDatabase),
      upsertRecord: vi.fn().mockResolvedValue({})
    };
    
    // Mock initializeAzureServices
    (initializeAzureServices as any).mockResolvedValue({
      blobStorage: mockBlobStorage,
      cosmosDb: mockCosmosDb
    });
  });

  beforeEach(async () => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup test user
    testUserId = uuidv4();
    
    // Create Express app
    app = createTestApp();
    app = express();
    app.use(express.json());
    
    // Mock Azure Blob Storage
    mockContainerClient = {
      getBlockBlobClient: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({}),
        deleteIfExists: vi.fn().mockResolvedValue({}),
      })
    };
    
    // Mock Azure Cosmos DB
    mockCosmosContainer = {
      items: {
        query: vi.fn().mockResolvedValue({ resources: [] }),
        upsert: vi.fn().mockResolvedValue({})
      }
    };
    
    // Mock Azure services
    mockBlobStorage = {
      uploadFile: vi.fn().mockResolvedValue('test-url'),
      blobServiceClient: {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient)
      }
    };
    
    mockCosmosDb = {
      container: mockCosmosContainer as unknown as Container,
      upsertRecord: vi.fn().mockResolvedValue({})
    };
    
    // Mock initializeAzureServices
    (initializeAzureServices as any).mockResolvedValue({
      blobStorage: mockBlobStorage,
      cosmosDb: mockCosmosDb
    });
    
    // Mock URL for blob storage
    mockContainerClient.url = 'https://test.blob.core.windows.net/container/test.xlsx';
    
    // Mock the upload route
    app.post('/upload', (req, res) => {
      res.status(200).json({ 
        message: 'File uploaded successfully',
        url: 'https://test.blob.core.windows.net/container/test.xlsx'
      });
    });
    
    // Create HTTP server
    const server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address !== 'string') {
          app.set('port', address.port);
        }
        resolve();
      });
    });
  });
  
  afterEach(() => {
    // Clean up server after each test
    const server = app.get('server');
    if (server) {
      server.close();
    }
  });


    mockBlobStorage = {
      blobServiceClient: {
        getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
      },
      uploadFile: vi.fn().mockResolvedValue({
        url: 'https://test.blob.core.windows.net/container/test.xlsx',
        name: 'test.xlsx',
      }),
    };

    mockCosmosDb = {
      container: mockCosmosContainer,
      upsertRecord: vi.fn().mockImplementation((item) => ({
        ...item,
        id: item.id || uuidv4(),
      })),
    };

    // Mock the initializeAzureServices function
    (initializeAzureServices as jest.Mock).mockResolvedValue({
      blobStorage: mockBlobStorage,
      cosmosDb: mockCosmosDb,
    });

    // Setup the Express app
    app = createApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /upload', () => {
    it('should upload and process a valid Excel file', async () => {
      // Mock XLSX functions
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            '!ref': 'A1:C3',
            A1: { v: 'Name' },
            B1: { v: 'Age' },
            C1: { v: 'Email' },
            A2: { v: 'John' },
            B2: { v: 30 },
            C2: { v: 'john@example.com' },
          },
        },
      };

      (XLSX.read as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
        { Name: 'John', Age: 30, Email: 'john@example.com' },
      ]);
      
      (XLSX.utils.decode_range as jest.Mock).mockReturnValue({
        s: { c: 0, r: 0 },
        e: { c: 2, r: 1 },
      });
      
      (XLSX.utils.encode_cell as jest.Mock).mockImplementation(({ c, r }) => {
        const col = String.fromCharCode(65 + c);
        return `${col}${r + 1}`;
      });

      // Create a test file
      const testFile = {
        ...mockFile,
        buffer: Buffer.from('test'),
        originalname: 'test.xlsx',
      };

      // Create mock request and response
      const req = mockRequest({}, testFile);
      req.user = { oid: testUserId };
      const res = mockResponse();
      const next = vi.fn();

      // Import the router directly for testing
      const { router } = await import('../src/routes/upload.route.js');
      
      // Find the upload route handler
      const route = router.stack.find(
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
      ) as any; // Type assertion since we know the route exists
      
      if (!route?.handle) {
        throw new Error('Upload route handler not found');
      }
      
      // Execute the route handler
      await route.handle(req as any, res as any, next);

      // Assertions
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'File processed successfully',
          data: expect.objectContaining({
            fileName: 'test.xlsx',
            rowCount: 1,
            columnCount: 3,
          }),
        })
      );

      // Verify Azure services were called correctly
      expect(mockBlobStorage.uploadFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          originalname: 'test.xlsx',
        })
      );

      expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          _partitionKey: testUserId,
          fileName: 'test.xlsx',
          documentType: 'excelRecord',
        })
      );
    });

    it('should return 400 if no file is uploaded', async () => {
      const req = mockRequest({});
      req.user = { oid: testUserId };
      const res = mockResponse();
      const next = vi.fn();

      const { router } = require('../src/routes/upload.route');
      const uploadRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
      );
      
      await uploadRoute.handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'No file uploaded',
        })
      );
    });

    it('should return 401 if user is not authenticated', async () => {
      const testFile = {
        ...mockFile,
        buffer: Buffer.from('test'),
        originalname: 'test.xlsx',
      };

      const req = mockRequest({}, testFile);
      // No need to set user, it's already undefined by default in mockRequest
      const res = mockResponse();
      const next = vi.fn();

      const { router } = require('../src/routes/upload.route');
      const uploadRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
      );
      
      await uploadRoute.handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication required',
        })
      );
    });

    it('should handle file processing errors', async () => {
      // Mock XLSX.read to throw an error
      (XLSX.read as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid Excel file');
      });

      const testFile = {
        ...mockFile,
        buffer: Buffer.from('invalid-excel'),
        originalname: 'test.xlsx',
      };

      const req = mockRequest({}, testFile);
      req.user = { oid: testUserId };
      const res = mockResponse();
      const next = vi.fn();

      const { router } = require('../src/routes/upload.route');
      const uploadRoute = router.stack.find(
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
      );
      
      await uploadRoute.handle(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to process Excel file. The file may be corrupted or in an unsupported format.',
        })
      );
    });
  });
});
