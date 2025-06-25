import { vi } from 'vitest';
import type { Multer } from 'multer';

// Create a mock implementation of multer that can be controlled from tests
const createMulterMock = () => {
  // Default mock file
  const defaultFile = {
    fieldname: 'file',
    originalname: 'test.xlsx',
    encoding: '7bit',
    mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('test'),
    size: 1024,
    destination: '',
    filename: 'test.xlsx',
    path: '/tmp/test.xlsx'
  };

  // Mock storage
  const memoryStorage = vi.fn().mockImplementation(() => ({
    _handleFile: vi.fn((req, file, cb) => {
      cb(null, defaultFile);
    }),
    _removeFile: vi.fn((req, file, cb) => {
      cb(null);
    })
  }));

  // Mock single file upload middleware
  const single = vi.fn().mockImplementation((fieldname) => {
    return (req: any, res: any, next: any) => {
      if (req.file === undefined) {
        // Simulate multer behavior when no file is uploaded
        req.file = undefined;
      } else if (req.file === null) {
        // Simulate multer error when file is invalid
        const err = new Error('Invalid file type');
        (err as any).code = 'LIMIT_UNEXPECTED_FILE';
        return next(err);
      } else {
        // Use the provided file or default
        req.file = { ...defaultFile, ...(req.file || {}) };
      }
      next();
    };
  });

  // Mock instance methods
  const mockInstance = {
    single,
    array: vi.fn(),
    fields: vi.fn(),
    any: vi.fn(),
    none: vi.fn(),
    _mockSingle: single // For test access
  };

  // The main multer mock function
  const multer = vi.fn().mockImplementation(() => mockInstance) as unknown as typeof Multer & {
    _mockSingle: typeof single;
  };

  // Add static methods
  multer.memoryStorage = memoryStorage;
  
  // For test access
  multer._mockSingle = single;

  return {
    multer,
    memoryStorage,
    defaultFile,
    resetMocks: () => {
      single.mockClear();
      memoryStorage.mockClear();
    }
  };
};

// Create and export the mock
const { multer, resetMocks, defaultFile } = createMulterMock();

// Reset mocks before each test
beforeEach(() => {
  resetMocks();
});

export default multer;
export { defaultFile };
