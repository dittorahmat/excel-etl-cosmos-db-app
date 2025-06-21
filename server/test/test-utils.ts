import { ContainerClient } from '@azure/storage-blob';
import { Container } from '@azure/cosmos';
import { vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// Mock crypto functions
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal();
  return Object.assign({}, actual, {
    randomBytes: vi.fn().mockImplementation((size) => Buffer.alloc(size, 'a')),
    createHash: vi.fn().mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mocked-hash-value'),
    })),
    timingSafeEqual: vi.fn().mockImplementation((a, b) => a.length === b.length && a.every((val: number, i: number) => val === b[i])),
  });
});

export interface MockFile extends Express.Multer.File {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  stream: any; // Not optional, required by File
  destination: string;
  filename: string;
  path: string;
  [key: string]: any;
}

export const mockFile: MockFile = {
  fieldname: 'file',
  originalname: 'test.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('test'),
  size: 1024,
  destination: '',
  filename: 'test.xlsx',
  path: '',
  stream: null,
};

export const mockContainerClient = {
  createIfNotExists: vi.fn().mockResolvedValue({}),
  getBlockBlobClient: vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({}),
    deleteIfExists: vi.fn().mockResolvedValue({}),
    url: 'https://test.blob.core.windows.net/container/test.xlsx',
  }),
} as unknown as ContainerClient;

export const mockCosmosContainer = {
  items: {
    create: vi.fn().mockResolvedValue({ resource: { id: 'test-id' } }),
    query: vi.fn().mockReturnThis(),
    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
  },
} as unknown as Container;

export interface MockRequest extends Partial<Request> {
  file?: Express.Multer.File;
  user?: { oid: string; name?: string; email?: string };
}

export const mockRequest = (body: any = {}, file?: Express.Multer.File): MockRequest => {
  const req: Partial<Request> = {
    body,
    file,
    headers: {},
    params: {},
    query: {},
    get: vi.fn() as any, // Type assertion to handle the overloaded get method
    user: { oid: 'test-user-id' },
  };
  return req as MockRequest;
};

export interface MockResponse extends Partial<Response> {
  status?: (code: number) => Response;
  sendStatus?: (code: number) => Response;
  send?: (body: any) => Response;
  json?: (body: any) => Response;
  end?: () => Response;
  [key: string]: any;
}

export const mockResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as MockResponse;
};

export const mockNext: NextFunction = vi.fn();
