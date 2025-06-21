// import { vi } from 'vitest'; // Only import in test context
import { MockBlobStorage } from '../../types/azure.js';

/**
 * Initialize mock Blob Storage for development and testing
 * @returns A mock implementation of AzureBlobStorage
 */
export function initializeMockBlobStorage(): MockBlobStorage {
  const uploadMock = (...args: any[]) => Promise.resolve({
    url: `https://mockstorage.blob.core.windows.net/mockcontainer/mock-${args[1]?.originalname ?? 'file'}`,
    name: `mock-${args[1]?.originalname ?? 'file'}`,
    size: args[1]?.size ?? 0,
  });

  const deleteMock = (...args: any[]) => Promise.resolve();

  const mockBlobStorage: MockBlobStorage = {
    blobServiceClient: {
      getContainerClient: (...args: any[]) => ({
        getBlockBlobClient: (...args: any[]) => ({
          uploadData: (...args: any[]) => Promise.resolve(undefined),
          deleteIfExists: (...args: any[]) => Promise.resolve(undefined),
          url: 'https://mockstorage.blob.core.windows.net/mockcontainer/mock-file',
        }),
        createIfNotExists: (...args: any[]) => Promise.resolve(undefined),
      }),
    } as any,
    // Minimal mock to satisfy ContainerClient interface for testing only
    getContainerClient: (...args: any[]) => ({
      getBlockBlobClient: (...args: any[]) => ({
        uploadData: (...args: any[]) => Promise.resolve(undefined),
        deleteIfExists: (...args: any[]) => Promise.resolve(undefined),
        url: 'https://mockstorage.blob.core.windows.net/mockcontainer/mock-file',
      }),
      createIfNotExists: (...args: any[]) => Promise.resolve(undefined),
    }) as any,
    uploadFile: uploadMock,
    deleteFile: deleteMock,
    _mocks: {
      upload: uploadMock,
      delete: deleteMock,
    },
  };

  return mockBlobStorage;
}
