import { vi, describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { BlobServiceClient } from '@azure/storage-blob';
import { blobStorageService, initializeBlobStorage, initializeBlobStorageAsync, type BlobStorageConfig } from '../../../../server/src/services/blob-storage/blob-storage.service';
import { AZURE_CONFIG } from '../../../../server/src/config/azure-config';

// Mock the Azure Blob Storage SDK
const createMockBlockBlobClient = (blobName: string) => ({
  uploadData: vi.fn().mockImplementation(() => Promise.resolve()),
  deleteIfExists: vi.fn().mockImplementation(() => Promise.resolve({ succeeded: true })),
  url: `https://test.blob.core.windows.net/test-container/${blobName}`,
});

const createMockContainerClient = () => ({
  getBlockBlobClient: vi.fn().mockImplementation(() => mockBlockBlobClient),
  deleteIfExists: vi.fn().mockImplementation(() => Promise.resolve({ succeeded: true })),
  createIfNotExists: vi.fn().mockImplementation(() => Promise.resolve({ succeeded: true })),
  containerName: 'test-container',
});

let mockBlockBlobClient: ReturnType<typeof createMockBlockBlobClient>;
let mockContainerClient: ReturnType<typeof createMockContainerClient>;
let mockBlobServiceClient: any;

// Mock the Azure Blob Storage module
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockImplementation(() => ({
      getContainerClient: vi.fn().mockImplementation(() => mockContainerClient)
    })),
  },
  ContainerClient: vi.fn().mockImplementation(() => mockContainerClient),
  BlockBlobClient: vi.fn().mockImplementation(() => mockBlockBlobClient),
}));

// Helper to reset the blob storage service between tests
const resetBlobStorageService = () => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Reset the singleton instance's internal state
  // @ts-expect-error - Accessing private property for testing
  blobStorageService.blobServiceClient = null;
  // @ts-expect-error - Accessing private property for testing
  blobStorageService.containerClient = null;
  // @ts-expect-error - Accessing private property for testing
  blobStorageService.isInitialized = false;
  
  // Reset mock implementations
  mockBlockBlobClient?.uploadData?.mockClear?.();
  mockBlockBlobClient?.deleteIfExists?.mockClear?.();
  mockContainerClient?.getBlockBlobClient?.mockClear?.();
  mockContainerClient?.createIfNotExists?.mockClear?.();
  vi.mocked(BlobServiceClient.fromConnectionString).mockClear();
};

describe('Blob Storage Service', () => {
  // Test configuration
  const testConfig: BlobStorageConfig = {
    connectionString: 'test-connection-string',
    containerName: 'test-container',
  };

  // Initialize mocks before each test
  beforeEach(() => {
    // Create a new mock block blob client for each test to ensure fresh state
    mockBlockBlobClient = createMockBlockBlobClient('test-blob');
    mockContainerClient = createMockContainerClient();
    
    // Configure the container client to return our mock block blob client
    mockContainerClient.getBlockBlobClient.mockImplementation((blobName: string) => {
      return createMockBlockBlobClient(blobName);
    });
    
    mockBlobServiceClient = {
      getContainerClient: vi.fn().mockReturnValue(mockContainerClient)
    };
    
    // Reset the singleton instance
    // @ts-expect-error - Accessing private property for testing
    blobStorageService.blobServiceClient = null;
    // @ts-expect-error - Accessing private property for testing
    blobStorageService.containerClient = null;
    // @ts-expect-error - Accessing private property for testing
    blobStorageService.isInitialized = false;
    
    // Reset the mock implementation
    vi.mocked(BlobServiceClient.fromConnectionString).mockImplementation(() => mockBlobServiceClient);
  });
  
  // Mock console methods
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Reset mocks and service state before each test
  beforeEach(() => {
    resetBlobStorageService();
  });

  // Clean up after all tests
  afterAll(() => {
    // Restore console methods
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
    
    // Reset all mocks
    vi.restoreAllMocks();
  });

  describe('initializeBlobStorage', () => {
    it('should initialize Blob Storage client successfully with test config', () => {
      // Execute with test config
      initializeBlobStorage(testConfig);

      // Verify the BlobServiceClient was created with the correct connection string
      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledTimes(1);
      
      // Verify the container client was created with the correct container name
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith(testConfig.containerName);
      
      // Verify createIfNotExists was NOT called (it's only called in initializeBlobStorageAsync)
      expect(mockContainerClient.createIfNotExists).not.toHaveBeenCalled();
    });

    it('should return early if Blob Storage client is already initialized', () => {
      // First call should initialize
      initializeBlobStorage(testConfig);
      
      // Reset the mocks
      vi.clearAllMocks();
      
      // Second call should return early
      initializeBlobStorage(testConfig);

      // Verify the mocks were not called again
      expect(BlobServiceClient.fromConnectionString).not.toHaveBeenCalled();
      expect(mockBlobServiceClient.getContainerClient).not.toHaveBeenCalled();
    });

    it('should throw an error if connection string is not configured', () => {
      // Execute with empty connection string
      const testFn = () => initializeBlobStorage({ 
        ...testConfig, 
        connectionString: '' 
      });
      
      // Verify it throws the expected error
      expect(testFn).toThrow('Azure Storage connection string is not configured');
    });
    
    it('should throw an error if container name is not configured', () => {
      // Execute with empty container name
      const testFn = () => initializeBlobStorage({ 
        ...testConfig, 
        containerName: '' 
      });
      
      // Verify it throws the expected error
      expect(testFn).toThrow('Azure Storage container name is not configured');
    });
  });
  
  describe('initializeBlobStorageAsync', () => {
    it('should initialize and return a blob storage client', async () => {
      // Execute with test config
      const client = await initializeBlobStorageAsync(testConfig);
      
      // Verify the client was initialized
      expect(client).toBeDefined();
      expect(typeof client.uploadFile).toBe('function');
      expect(typeof client.deleteFile).toBe('function');
      expect(typeof client.getFileUrl).toBe('function');
      expect(typeof client.getContainerName).toBe('function');
      
      // Verify the container was created
      expect(mockContainerClient.createIfNotExists).toHaveBeenCalledTimes(1);
    });
    
    it('should upload a file successfully', async () => {
      // Initialize the client
      const client = await initializeBlobStorageAsync(testConfig);
      
      // Mock file data
      const mockFile = {
        buffer: Buffer.from('test file content'),
        mimetype: 'text/plain'
      } as any;
      
      // Setup the mock to return a specific URL for the test file
      const testBlobName = 'test-file.txt';
      const expectedUrl = `https://test.blob.core.windows.net/test-container/${testBlobName}`;
      
      // Mock getBlockBlobClient to return a client with the expected URL
      const mockBlobClient = createMockBlockBlobClient(testBlobName);
      mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlobClient);
      
      // Upload a file
      const result = await client.uploadFile(mockFile, testBlobName);
      
      // Verify the upload was successful
      expect(result).toBe(expectedUrl);
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(testBlobName);
      expect(mockBlobClient.uploadData).toHaveBeenCalledWith(
        mockFile.buffer,
        { blobHTTPHeaders: { blobContentType: 'text/plain' } }
      );
    });
    
    it('should delete a file successfully', async () => {
      // Setup test data
      const blobName = 'test-file.txt';
      
      // Create a fresh mock for this test
      const mockBlobClient = createMockBlockBlobClient(blobName);
      mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlobClient);
      
      // Initialize the client
      const client = await initializeBlobStorageAsync(testConfig);
      
      // Delete a file
      const result = await client.deleteFile(blobName);
      
      // Verify the delete was successful
      expect(result).toBe(true);
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(blobName);
      expect(mockBlobClient.deleteIfExists).toHaveBeenCalledTimes(1);
    });
    
    it('should get file URL', async () => {
      // Initialize the client
      const client = await initializeBlobStorageAsync(testConfig);
      
      // Setup test data
      const blobName = 'test-file.txt';
      const expectedUrl = `https://test.blob.core.windows.net/test-container/${blobName}`;
      
      // Mock getBlockBlobClient to return a client with the expected URL
      const mockBlobClient = createMockBlockBlobClient(blobName);
      mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlobClient);
      
      // Get a file URL
      const url = client.getFileUrl(blobName);
      
      // Verify the URL is correct
      expect(url).toBe(expectedUrl);
      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(blobName);
    });
    
    it('should get container name', async () => {
      // Initialize the client
      const client = await initializeBlobStorageAsync(testConfig);
      
      // Get container name
      const containerName = client.getContainerName();
      
      // Verify the container name is correct
      expect(containerName).toBe('test-container');
    });
  });
  
  describe('blobStorageService', () => {
    it('should be a singleton instance', () => {
      const instance1 = blobStorageService;
      const instance2 = blobStorageService;
      
      expect(instance1).toBe(instance2);
    });
    
    it('should initialize with config', () => {
      // Initialize the service
      blobStorageService.initialize(testConfig);
      
      // Verify the service was initialized
      // @ts-expect-error - Accessing private property for testing
      expect(blobStorageService.isInitialized).toBe(true);
      // @ts-expect-error - Accessing private property for testing
      expect(blobStorageService.blobServiceClient).toBeDefined();
      // @ts-expect-error - Accessing private property for testing
      expect(blobStorageService.containerClient).toBeDefined();
    });
  });
});