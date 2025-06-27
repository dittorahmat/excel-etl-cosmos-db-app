import type { Request, Response, NextFunction } from 'express';
import type { Multer, StorageEngine, Options } from 'multer';
import { Readable } from 'stream';

// Define a custom type that matches what multer expects for a file stream
type MulterFileStream = Readable & { destroy?: (error?: Error) => void };

// Create a mock implementation of multer that can be controlled from tests
const createMulterMock = () => {
  // Create a mock stream
  const mockStream = new Readable() as MulterFileStream;
  mockStream._read = () => {}; // Add _read method to make it a proper Readable

  // Default mock file
  const defaultFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('test'),
    size: 1024,
    destination: '',
    filename: 'test.xlsx',
    path: '/tmp/test.xlsx',
    stream: mockStream
  };

  // Mock storage engine
  const storageEngine: StorageEngine = {
    _handleFile: (req, file, callback) => {
      callback(null, { ...defaultFile, ...file });
    },
    _removeFile: (req, file, callback) => {
      callback(null);
    }
  };

  // Mock single file upload middleware
  const single = vi.fn().mockImplementation((fieldname: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // If we have a custom implementation from the test, use it
      if (single.mock.calls.length > 0 && single.mock.calls[0][0]) {
        return single.mock.calls[0][0](req, res, next);
      }
      // Default behavior - attach a file to the request
      req.file = { ...defaultFile };
      next();
    };
  });

  // Mock multer instance methods
  const multerInstance = {
    single,
    array: vi.fn(),
    fields: vi.fn(),
    none: vi.fn(),
    any: vi.fn(),
  };

  // Mock multer function
  const multer = vi.fn().mockImplementation((options?: Options) => {
    return multerInstance;
  });

  // Add memoryStorage to multer function
  (multer as any).memoryStorage = vi.fn().mockReturnValue(storageEngine);

  // Add diskStorage to multer function
  (multer as any).diskStorage = vi.fn().mockReturnValue(storageEngine);

  // Reset all mocks
  const resetMocks = () => {
    single.mockClear();
    (multer as any).memoryStorage.mockClear();
    (multer as any).diskStorage.mockClear();
    Object.values(multerInstance).forEach((fn: any) => {
      if (typeof fn.mockClear === 'function') {
        fn.mockClear();
      }
    });
  };

  // Add test utilities to the multer function
  (multer as any)._test = {
    resetMocks,
    defaultFile,
    single,
    storageEngine
  };

  return multer as unknown as Multer & {
    _test: {
      resetMocks: () => void;
      defaultFile: Express.Multer.File;
      single: typeof single;
      storageEngine: StorageEngine;
    };
  };
};

// Create the mock
const mockMulter = createMulterMock();

// Reset mocks before each test
beforeEach(() => {
  mockMulter._test.resetMocks();
});

// Export the mock and test utilities
export const testUtils = {
  getDefaultFile: () => {
    const mockStream = new Readable() as MulterFileStream;
    mockStream._read = () => {};
    
    return {
      fieldname: 'file',
      originalname: 'test.xlsx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test'),
      size: 1024,
      destination: '',
      filename: 'test.xlsx',
      path: '/tmp/test.xlsx',
      stream: mockStream
    };
  }
};

export default mockMulter;
