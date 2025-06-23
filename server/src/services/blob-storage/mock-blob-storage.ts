import type { MockBlobStorage, MulterFile } from '../../types/azure.js';

interface UploadResult {
  url: string;
  name: string;
  size: number;
}

/**
 * Initialize mock Blob Storage for development and testing
 * @returns A mock implementation of AzureBlobStorage
 */
export function initializeMockBlobStorage(): MockBlobStorage {
  const uploadMock = async (_containerName: string, file?: MulterFile): Promise<UploadResult> => ({
    url: `https://mockstorage.blob.core.windows.net/mockcontainer/mock-${file?.originalname ?? 'file'}`,
    name: `mock-${file?.originalname ?? 'file'}`,
    size: file?.size ?? 0,
  });

  const deleteMock = async (_containerName: string, _blobName: string): Promise<void> => {
    // No-op for mock
  };

  const mockBlobStorage: MockBlobStorage = {
    blobServiceClient: {
      getContainerClient: (_containerName: string) => ({
        getBlockBlobClient: (_blobName: string) => ({
          uploadData: async (_data: unknown) => Promise.resolve(undefined),
          deleteIfExists: async () => Promise.resolve(undefined),
          url: 'https://mockstorage.blob.core.windows.net/mockcontainer/mock-file',
        }),
        createIfNotExists: async () => Promise.resolve(undefined),
      }),
    } as unknown as MockBlobStorage['blobServiceClient'],
    // Minimal mock to satisfy ContainerClient interface for testing only
    getContainerClient: (_containerName: string) => ({
      getBlockBlobClient: (_blobName: string) => ({
        uploadData: async (_data: unknown) => Promise.resolve(undefined),
        deleteIfExists: async () => Promise.resolve(undefined),
        url: 'https://mockstorage.blob.core.windows.net/mockcontainer/mock-file',
      }),
      createIfNotExists: async () => Promise.resolve(undefined),
    }) as unknown as ReturnType<MockBlobStorage['getContainerClient']>,
    uploadFile: uploadMock,
    deleteFile: deleteMock,
    _mocks: {
      upload: uploadMock,
      delete: deleteMock,
    },
  };

  return mockBlobStorage;
}
