import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type * as multer from 'multer';

// Create a mock memory storage implementation
const mockMemoryStorage = (): multer.StorageEngine => ({
  _handleFile: (_req: Request, file: Express.Multer.File, cb: (error?: Error | null, info?: Partial<Express.Multer.File>) => void) => {
    // Simulate successful file handling
    cb(null, {
      filename: file.originalname,
      path: '/mock/path',
      size: file.size
    });
  },
  _removeFile: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null) => void) => {
    // Simulate successful file removal
    cb(null);
  }
});

// Create a mock multer function
const createMockMulter = () => {
  const single = vi.fn((_fieldName: string) => (req: Request, _res: Response, next: NextFunction) => {
    req.file = {
      fieldname: 'file',
      originalname: 'test.xlsx',
      encoding: '7bit',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from('test'),
      size: 1024,
      destination: '',
      filename: 'test.xlsx',
      path: '/tmp/test.xlsx',
      stream: null as any
    } as Express.Multer.File;
    next();
  });

  const fn = vi.fn(() => ({
    single,
    memoryStorage: vi.fn().mockReturnValue({})
  }));

  // Add static methods
  const mockFn = fn as unknown as typeof multer;
  
  mockFn.memoryStorage = vi.fn().mockReturnValue(mockMemoryStorage());
  
  return mockFn;
};

// Create and export the mock multer instance
const mockMulter = createMockMulter();
// Ensure .single is directly accessible for override in tests
(mockMulter as any).single = (mockMulter() as any).single;
export default mockMulter;
