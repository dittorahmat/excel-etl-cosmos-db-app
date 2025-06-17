import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { vi } from 'vitest';

export interface MockFile extends Express.Multer.File {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  stream?: any;
  destination?: string;
  filename?: string;
  path?: string;
}

export const mockFile: MockFile = {
  fieldname: 'file',
  originalname: 'test.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('test file content'),
  size: 12345,
};

export interface MockRequest extends Partial<Request> {
  file?: Express.Multer.File;
  user?: {
    oid: string;
    name?: string;
    email?: string;
  };
}

export const mockRequest = (body: any = {}, file?: Express.Multer.File): MockRequest => ({
  body,
  file,
  headers: {},
  query: {},
  params: {},
  get: vi.fn(),
  header: vi.fn(),
  accepts: vi.fn(),
  acceptsCharsets: vi.fn(),
  acceptsEncodings: vi.fn(),
  acceptsLanguages: vi.fn(),
  range: vi.fn(),
  is: vi.fn(),
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
});

export interface MockResponse extends Partial<Response> {
  status: (code: number) => MockResponse;
  json: (body: any) => MockResponse;
  send: (body: any) => MockResponse;
  sendStatus: (status: number) => MockResponse;
  set: (field: string, value?: string | string[]) => MockResponse;
}

export const mockResponse = (): MockResponse => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.sendStatus = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.render = vi.fn().mockReturnValue(res);
  res.end = vi.fn();
  res.type = vi.fn().mockReturnValue(res);
  res.format = vi.fn().mockReturnValue(res);
  res.attachment = vi.fn().mockReturnValue(res);
  res.download = vi.fn().mockReturnValue(res);
  res.links = vi.fn().mockReturnValue(res);
  res.locals = {};
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
