import { vi } from 'vitest';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { initializeBlobStorage, initializeBlobStorageAsync, getOrInitializeBlobStorage } from '@/services/blob-storage/blob-storage.service';
import { AZURE_CONFIG } from '@/config/azure-config';

// Mock the Azure Blob Storage SDK
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn(() => ({
      getContainerClient: vi.fn(() => ({
        createIfNotExists: vi.fn(() => ({ succeeded: true })),
        getBlockBlobClient: vi.fn(() => ({
          uploadData: vi.fn(),
          deleteIfExists: vi.fn(),
        })),
      })),
    })),
  },
  ContainerClient: vi.fn(),
}));

describe('Blob Storage Service', () => {
  const originalConnectionString = AZURE_CONFIG.storage.connectionString;
  const originalContainerName = AZURE_CONFIG.storage.containerName;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;
  let mockConsoleLog: ReturnType<typeof vi.spyOn>;
  let mockConsoleWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Re-import the functions and module-scoped variables to get fresh instances
    const service = await import('../../../server/src/services/blob-storage/blob-storage.service.js');
    service.blobServiceClient = null;
    service.containerClient = null;

    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Re-assign the functions to the local scope after re-importing the module
    initializeBlobStorage = service.initializeBlobStorage;
    initializeBlobStorageAsync = service.initializeBlobStorageAsync;
    getOrInitializeBlobStorage = service.getOrInitializeBlobStorage;
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe('initializeBlobStorage', () => {
    it('should initialize Blob Storage client successfully', () => {
      AZURE_CONFIG.storage.connectionString = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net';
      AZURE_CONFIG.storage.containerName = 'test-container';

      initializeBlobStorage();

      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledTimes(1);
      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledWith('DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net');
      const mockBlobServiceClient = (BlobServiceClient.fromConnectionString as vi.Mock).mock.results[0].value;
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledTimes(1);
      expect(mockBlobServiceClient.getContainerClient).toHaveBeenCalledWith('test-container');
    });

    it('should return early if Blob Storage client is already initialized', () => {
      AZURE_CONFIG.storage.connectionString = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net';
      AZURE_CONFIG.storage.containerName = 'test-container';

      initializeBlobStorage();
      initializeBlobStorage(); // Call again

      expect(BlobServiceClient.fromConnectionString).toHaveBeenCalledTimes(1); // Should only be called once
    });

    it('should throw an error if connection string is not configured', () => {
      AZURE_CONFIG.storage.connectionString = '';
      AZURE_CONFIG.storage.containerName = 'test-container';

      expect(() => initializeBlobStorage()).toThrow('Azure Storage connection string is not configured');
      expect(BlobServiceClient.fromConnectionString).not.toHaveBeenCalled();
    });
  });
});