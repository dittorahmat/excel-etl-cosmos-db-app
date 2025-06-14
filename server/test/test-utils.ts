import { ContainerClient } from '@azure/storage-blob';
import { Container } from '@azure/cosmos';

export const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'test.xlsx',
  encoding: '7bit',
  mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from('test'),
  size: 1024,
  destination: '',
  filename: 'test.xlsx',
  path: '',
} as Express.Multer.File;

export const mockContainerClient = {
  createIfNotExists: jest.fn().mockResolvedValue({}),
  getBlockBlobClient: jest.fn().mockReturnValue({
    upload: jest.fn().mockResolvedValue({}),
    deleteIfExists: jest.fn().mockResolvedValue({}),
    url: 'https://test.blob.core.windows.net/container/test.xlsx',
  }),
} as unknown as ContainerClient;

export const mockCosmosContainer = {
  items: {
    create: jest.fn().mockResolvedValue({ resource: { id: 'test-id' } }),
  },
} as unknown as Container;

export const mockRequest = (body: any = {}, file?: Express.Multer.File) => {
  const req: any = {
    body,
    file,
    headers: {},
    params: {},
    query: {},
    get: jest.fn(),
  };
  return req as Express.Request;
};

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as unknown as Express.Response;
};

export const mockNext = jest.fn() as jest.MockedFunction<Express.NextFunction>;
