import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { vi } from 'vitest';

import { Readable } from 'stream';

/**
 * MockFile interface that properly extends Express.Multer.File
 * This is used for testing file uploads
 */
export interface MockFile extends Express.Multer.File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  stream: Readable;
}

// Create a simple readable stream mock
const createReadableStream = () => {
  const stream = new (require('stream').Readable)();
  stream._read = () => {}; // _read is required but you can noop it
  return stream;
};

export const mockFile: MockFile = {
  fieldname: 'file',
  originalname: 'test.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('test file content'),
  size: 12345,
  stream: createReadableStream(),
  destination: '/tmp',
  filename: 'test.xlsx',
  path: '/tmp/test.xlsx'
};

// Helper type to make all properties partial and mockable
type Mockable<T> = {
  [P in keyof T]?: T[P] extends (...args: any[]) => any ? ReturnType<typeof vi.fn> : T[P];
};

export interface MockRequest extends Mockable<Request> {
  file?: Express.Multer.File;
  user?: {
    oid: string;
    name?: string;
    email?: string;
  };
  get?: ReturnType<typeof vi.fn>;
  header?: ReturnType<typeof vi.fn>;
  accepts?: ReturnType<typeof vi.fn>;
  acceptsCharsets?: ReturnType<typeof vi.fn>;
  acceptsEncodings?: ReturnType<typeof vi.fn>;
  acceptsLanguages?: ReturnType<typeof vi.fn>;
  range?: ReturnType<typeof vi.fn>;
  is?: ReturnType<typeof vi.fn>;
}

export const mockRequest = (body: any = {}, file?: Express.Multer.File): MockRequest => {
  const req: any = {
    body,
    file,
    headers: {},
    query: {},
    params: {},
    protocol: 'http',
    secure: false,
    ip: '127.0.0.1',
    ips: ['127.0.0.1'],
    subdomains: [],
    path: '/',
    hostname: 'localhost',
    host: 'localhost:3000',
    fresh: true,
    stale: false,
    xhr: false,
    method: 'GET',
    url: '/',
    originalUrl: '/',
    cookies: {},
    signedCookies: {},
    route: {},
  };

  // Add mock functions with proper typing
  req.get = vi.fn();
  req.header = vi.fn();
  req.accepts = vi.fn();
  req.acceptsCharsets = vi.fn();
  req.acceptsEncodings = vi.fn();
  req.acceptsLanguages = vi.fn();
  req.range = vi.fn();
  req.is = vi.fn();

  return req as MockRequest;
};

// Simplified MockResponse interface that doesn't extend Response to avoid type conflicts
interface MockResponse {
  status: (code: number) => MockResponse;
  json: (body: any) => MockResponse;
  send: (body: any) => MockResponse;
  sendStatus: (status: number) => MockResponse;
  set: (field: string, value?: string | string[]) => MockResponse;
  clearCookie: (name: string, options?: any) => MockResponse;
  cookie: (name: string, value: string, options?: any) => MockResponse;
  redirect: (statusOrUrl: string | number, url?: string) => MockResponse;
  render: (view: string, options?: any) => MockResponse;
  end: (data?: any) => void;
  type: (type: string) => MockResponse;
  format: (obj: any) => MockResponse;
  attachment: (filename?: string) => MockResponse;
  download: (path: string, filename?: string, callback?: (err: Error) => void) => void;
  links: (links: any) => MockResponse;
  locals: Record<string, any>;
  // Add any other methods you need to mock
}

export const mockResponse = (): MockResponse => {
  const res: any = {
    locals: {},
  };

  // Chainable methods
  const chainableMethods = [
    'status', 'json', 'send', 'sendStatus', 'set', 'clearCookie', 
    'cookie', 'redirect', 'render', 'type', 'format', 'attachment',
    'download', 'links'
  ];

  chainableMethods.forEach(method => {
    res[method] = vi.fn().mockReturnValue(res);
  });

  // Non-chainable methods
  res.end = vi.fn().mockReturnValue(undefined);

  return res as MockResponse;
};

export const mockNext = vi.fn<Parameters<NextFunction>, ReturnType<NextFunction>>();

// Mock crypto functions
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomBytes: vi.fn().mockImplementation((size) => {
      return Buffer.alloc(size, 'a'); // Return a buffer of 'a's for testing
    }),
    createHash: vi.fn().mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mocked-hash-value'),
    })),
    timingSafeEqual: vi.fn().mockImplementation((a, b) => {
      return a.length === b.length && a.every((val: number, i: number) => val === b[i]);
    }),
  };
});
