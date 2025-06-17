import { vi } from 'vitest';
// Mock crypto functions
vi.mock('crypto', async (importOriginal) => {
    const actual = await importOriginal();
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
            return a.length === b.length && a.every((val, i) => val === b[i]);
        }),
    };
});
export const mockFile = {
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
};
export const mockCosmosContainer = {
    items: {
        create: vi.fn().mockResolvedValue({ resource: { id: 'test-id' } }),
        query: vi.fn().mockReturnThis(),
        fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
    },
};
export const mockRequest = (body = {}, file) => {
    const req = {
        body,
        file,
        headers: {},
        params: {},
        query: {},
        get: vi.fn(), // Type assertion to handle the overloaded get method
        user: { oid: 'test-user-id' },
    };
    return req;
};
export const mockResponse = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res;
};
export const mockNext = vi.fn();
