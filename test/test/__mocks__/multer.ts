import type { Request, Response, NextFunction } from 'express';
import type { Multer, StorageEngine, Options } from 'multer';
import { Readable } from 'stream';

// Define a custom type that matches what multer expects for a file stream
type MulterFileStream = Readable & { destroy?: (error?: Error) => void };

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
  stream: new Readable() as MulterFileStream
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
const mockMulter = vi.fn().mockImplementation((options?: Options) => {
  return multerInstance;
}) as unknown as Multer & {
  memoryStorage: StorageEngine;
  diskStorage: StorageEngine;
  _test: {
    resetMocks: () => void;
    defaultFile: Express.Multer.File;
    single: typeof single;
    storageEngine: StorageEngine;
  };
};

// Add memoryStorage to multer function
mockMulter.memoryStorage = vi.fn().mockReturnValue(storageEngine);

// Add diskStorage to multer function
mockMulter.diskStorage = vi.fn().mockReturnValue(storageEngine);

// Add test utilities to the multer function
mockMulter._test = {
  resetMocks: () => {
    single.mockClear();
    (mockMulter.memoryStorage as any).mockClear();
    (mockMulter.diskStorage as any).mockClear();
    Object.values(multerInstance).forEach((fn: any) => {
      if (typeof fn.mockClear === 'function') {
        fn.mockClear();
      }
    });
  },
  defaultFile,
  single,
  storageEngine
};

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