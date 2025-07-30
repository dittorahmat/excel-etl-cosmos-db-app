import type { MockBlobStorage, MulterFile } from '../../types/azure.js';

/**
 * Initialize mock Blob Storage for development and testing
 * @returns A mock implementation of AzureBlobStorage that matches the MockBlobStorage interface
 */
export function initializeMockBlobStorage(): MockBlobStorage {
  // Mock container name for testing
  const mockContainerName = 'mock-container';
  
  // Mock implementation of the upload function
  const uploadMock = async (file: MulterFile, blobName: string): Promise<string> => {
    const url = `https://mockstorage.blob.core.windows.net/${mockContainerName}/${blobName}`;
    console.log(`[MOCK] Uploaded file ${file.originalname} as ${blobName}`);
    return url;
  };

  // Mock implementation of the delete function
  const deleteMock = async (blobName: string): Promise<boolean> => {
    console.log(`[MOCK] Deleted file ${blobName}`);
    return true;
  };

  // Mock implementation of getFileUrl
  const getFileUrl = (blobName: string): string => {
    return `https://mockstorage.blob.core.windows.net/${mockContainerName}/${blobName}`;
  };

  // Mock implementation of getContainerName
  const getContainerName = (): string => {
    return mockContainerName;
  };

  // Create the mock blob storage object that matches the MockBlobStorage interface
  const mockBlobStorage: MockBlobStorage = {
    // Public methods that match MockBlobStorage interface
    upload: uploadMock,
    delete: deleteMock,
    getFileUrl: getFileUrl,
    getContainerName: getContainerName,
    
    // Internal mocks for testing
    _mocks: {
      upload: uploadMock,
      delete: deleteMock,
    },
  };

  return mockBlobStorage;
}
