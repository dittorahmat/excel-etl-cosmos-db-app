import { vi } from 'vitest';
import { initializeAzureServices } from '../../../server/src/config/azure-services.js';

vi.mock('../../../server/src/services/index.js', async (importOriginal) => {
  const originalModule = await importOriginal<typeof import('../../../server/src/services/index.js')>();
  return {
    ...originalModule,
    initializeBlobStorageAsync: vi.fn(),
    initializeMockBlobStorage: vi.fn(),
    initializeCosmosDB: vi.fn(),
    initializeMockCosmosDB: vi.fn(),
  };
});

// Import the mocked functions from the mocked index.js
import { initializeBlobStorageAsync, initializeMockBlobStorage, initializeCosmosDB, initializeMockCosmosDB } from '../../../server/src/services/index.js';

describe('initializeAzureServices', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv; // Reset NODE_ENV for each test
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set mock implementations directly on the imported mocked functions
    initializeBlobStorageAsync.mockResolvedValue({
      client: {} as any,
      containerClient: {} as any,
      uploadBlob: vi.fn(),
      getBlobStream: vi.fn(),
      deleteBlob: vi.fn(),
    });
    initializeCosmosDB.mockResolvedValue({
      cosmosClient: {} as any,
      database: {} as any,
      container: vi.fn(),
      _getPartitionKeyValue: vi.fn(),
      upsertRecord: vi.fn(),
      query: vi.fn(),
      getRecord: vi.fn(),
      deleteRecord: vi.fn(),
    });

    initializeMockBlobStorage.mockReturnValue({
      client: {} as any,
      containerClient: {} as any,
      uploadBlob: vi.fn(),
      getBlobStream: vi.fn(),
      deleteBlob: vi.fn(),
    });
    initializeMockCosmosDB.mockReturnValue({
      cosmosClient: {} as any,
      database: {} as any,
      container: vi.fn(),
      _getPartitionKeyValue: vi.fn(),
      upsertRecord: vi.fn(),
      query: vi.fn(),
      getRecord: vi.fn(),
      deleteRecord: vi.fn(),
      _mocks: {} as any,
      upsert: vi.fn(),
      delete: vi.fn(),
    });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv; // Restore original NODE_ENV
    mockConsoleError.mockRestore();
  });

  it('should initialize real services in non-test environment', async () => {
    process.env.NODE_ENV = 'development'; // Or 'production'
    const services = await initializeAzureServices();

    expect(initializeBlobStorageAsync).toHaveBeenCalledTimes(1);
    expect(initializeMockBlobStorage).not.toHaveBeenCalled();
    expect(initializeCosmosDB).toHaveBeenCalledTimes(1);
    expect(initializeMockCosmosDB).not.toHaveBeenCalled();
    expect(services).toHaveProperty('blobStorage');
    expect(services).toHaveProperty('cosmosDb');
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('should initialize mock services in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const services = await initializeAzureServices();

    expect(initializeBlobStorageAsync).not.toHaveBeenCalled();
    expect(initializeMockBlobStorage).toHaveBeenCalledTimes(1);
    expect(initializeCosmosDB).not.toHaveBeenCalled();
    expect(initializeMockCosmosDB).toHaveBeenCalledTimes(1);
    expect(services).toHaveProperty('blobStorage');
    expect(services).toHaveProperty('cosmosDb');
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('should handle errors during blob storage initialization', async () => {
    process.env.NODE_ENV = 'development';
    const mockError = new Error('Blob storage init failed');
    initializeBlobStorageAsync.mockRejectedValue(mockError); // Directly set mock behavior

    await expect(initializeAzureServices()).rejects.toThrow('Failed to initialize Azure services: Blob storage init failed');
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError).toHaveBeenCalledWith('Failed to initialize Azure services:', mockError);
  });

  it('should handle errors during cosmos DB initialization', async () => {
    process.env.NODE_ENV = 'development';
    const mockError = new Error('Cosmos DB init failed');
    initializeCosmosDB.mockRejectedValue(mockError); // Directly set mock behavior

    await expect(initializeAzureServices()).rejects.toThrow('Failed to initialize Azure services: Cosmos DB init failed');
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError).toHaveBeenCalledWith('Failed to initialize Azure services:', mockError);
  });

  it('should handle errors during mock blob storage initialization', async () => {
    process.env.NODE_ENV = 'test';
    const mockError = new Error('Mock Blob storage init failed');
    initializeMockBlobStorage.mockRejectedValue(mockError);

    await expect(initializeAzureServices()).rejects.toThrow('Failed to initialize Azure services: Mock Blob storage init failed');
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError).toHaveBeenCalledWith('Failed to initialize Azure services:', mockError);
  });

  it('should handle errors during mock cosmos DB initialization', async () => {
    process.env.NODE_ENV = 'test';
    const mockError = new Error('Mock Cosmos DB init failed');
    initializeMockCosmosDB.mockRejectedValue(mockError);

    await expect(initializeAzureServices()).rejects.toThrow('Failed to initialize Azure services: Mock Cosmos DB init failed');
    expect(mockConsoleError).toHaveBeenCalledTimes(2);
    expect(mockConsoleError).toHaveBeenCalledWith('Failed to initialize Azure services:', mockError);
  });
});
