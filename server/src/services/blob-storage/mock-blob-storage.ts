import { vi } from 'vitest';
import { MockBlobStorage } from '../../types/azure.js';

/**
 * Initialize mock Blob Storage for development and testing
 * @returns A mock implementation of AzureBlobStorage
 */
export function initializeMockBlobStorage(): MockBlobStorage {
  const uploadMock = vi.fn().mockImplementation((_containerName: string, file: Express.Multer.File) => {
    return Promise.resolve({
      url: `https://mockstorage.blob.core.windows.net/mockcontainer/mock-${file.originalname}`,
      name: `mock-${file.originalname}`,
      size: file.size,
    });
  });

  const deleteMock = vi.fn().mockImplementation((): Promise<void> => Promise.resolve());

  const mockBlobStorage: MockBlobStorage = {
    blobServiceClient: {
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({
          uploadData: vi.fn().mockResolvedValue(undefined),
          deleteIfExists: vi.fn().mockResolvedValue(undefined),
          url: 'https://mockstorage.blob.core.windows.net/mockcontainer/mock-file',
        }),
        createIfNotExists: vi.fn().mockResolvedValue(undefined),
      }),
    } as any,
    getContainerClient: vi.fn().mockImplementation(() => ({
      getBlockBlobClient: vi.fn().mockReturnValue({
        uploadData: vi.fn().mockResolvedValue(undefined),
        deleteIfExists: vi.fn().mockResolvedValue(undefined),
        url: 'https://mockstorage.blob.core.windows.net/mockcontainer/mock-file',
      }),
      createIfNotExists: vi.fn().mockResolvedValue(undefined),
    })),
    uploadFile: uploadMock,
    deleteFile: deleteMock,
    _mocks: {
      upload: uploadMock,
      delete: deleteMock,
    },
  };

  return mockBlobStorage;
}
