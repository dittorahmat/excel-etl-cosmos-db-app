import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockFile, mockRequest, mockResponse } from './test-utils.js';
import { createApp } from '../src/server.js';
import { initializeAzureServices } from '../src/config/azure.js';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
// Mock the Azure services
vi.mock('../src/config/azure', () => ({
    initializeAzureServices: vi.fn(),
}));
// Mock the XLSX module
vi.mock('xlsx', () => ({
    read: vi.fn(),
    utils: {
        sheet_to_json: vi.fn(),
        decode_range: vi.fn(),
        encode_cell: vi.fn(),
    },
}));
describe('Upload Endpoint', () => {
    let app;
    let mockBlobStorage;
    let mockCosmosDb;
    let testUserId;
    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        // Setup test user
        testUserId = uuidv4();
        // Mock Azure services
        mockContainerClient = {
            getBlockBlobClient: vi.fn().mockReturnValue({
                upload: vi.fn().mockResolvedValue({}),
                deleteIfExists: vi.fn().mockResolvedValue({}),
                url: 'https://test.blob.core.windows.net/container/test.xlsx',
            }),
        };
        mockCosmosContainer = {
            items: {
                create: vi.fn().mockImplementation((item) => ({
                    resource: { ...item, id: uuidv4() },
                })),
                query: vi.fn().mockReturnValue({
                    fetchAll: vi.fn().mockResolvedValue({ resources: [] }),
                }),
            },
        };
        mockBlobStorage = {
            blobServiceClient: {
                getContainerClient: vi.fn().mockReturnValue(mockContainerClient),
            },
            uploadFile: vi.fn().mockResolvedValue({
                url: 'https://test.blob.core.windows.net/container/test.xlsx',
                name: 'test.xlsx',
            }),
        };
        mockCosmosDb = {
            container: mockCosmosContainer,
            upsertRecord: vi.fn().mockImplementation((item) => ({
                ...item,
                id: item.id || uuidv4(),
            })),
        };
        // Mock the initializeAzureServices function
        initializeAzureServices.mockResolvedValue({
            blobStorage: mockBlobStorage,
            cosmosDb: mockCosmosDb,
        });
        // Setup the Express app
        app = createApp();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    describe('POST /upload', () => {
        it('should upload and process a valid Excel file', async () => {
            // Mock XLSX functions
            const mockWorkbook = {
                SheetNames: ['Sheet1'],
                Sheets: {
                    Sheet1: {
                        '!ref': 'A1:C3',
                        A1: { v: 'Name' },
                        B1: { v: 'Age' },
                        C1: { v: 'Email' },
                        A2: { v: 'John' },
                        B2: { v: 30 },
                        C2: { v: 'john@example.com' },
                    },
                },
            };
            XLSX.read.mockReturnValue(mockWorkbook);
            XLSX.utils.sheet_to_json.mockReturnValue([
                { Name: 'John', Age: 30, Email: 'john@example.com' },
            ]);
            XLSX.utils.decode_range.mockReturnValue({
                s: { c: 0, r: 0 },
                e: { c: 2, r: 1 },
            });
            XLSX.utils.encode_cell.mockImplementation(({ c, r }) => {
                const col = String.fromCharCode(65 + c);
                return `${col}${r + 1}`;
            });
            // Create a test file
            const testFile = {
                ...mockFile,
                buffer: Buffer.from('test'),
                originalname: 'test.xlsx',
            };
            // Create mock request and response
            const req = mockRequest({}, testFile);
            req.user = { oid: testUserId };
            const res = mockResponse();
            const next = vi.fn();
            // Import the router directly for testing
            const { router } = await import('../src/routes/upload.route.js');
            // Find the upload route handler
            const route = router.stack.find((layer) => layer.route?.path === '/' && layer.route?.methods?.post); // Type assertion since we know the route exists
            if (!route?.handle) {
                throw new Error('Upload route handler not found');
            }
            // Execute the route handler
            await route.handle(req, res, next);
            // Assertions
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'File processed successfully',
                data: expect.objectContaining({
                    fileName: 'test.xlsx',
                    rowCount: 1,
                    columnCount: 3,
                }),
            }));
            // Verify Azure services were called correctly
            expect(mockBlobStorage.uploadFile).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                originalname: 'test.xlsx',
            }));
            expect(mockCosmosDb.upsertRecord).toHaveBeenCalledWith(expect.objectContaining({
                _partitionKey: testUserId,
                fileName: 'test.xlsx',
                documentType: 'excelRecord',
            }));
        });
        it('should return 400 if no file is uploaded', async () => {
            const req = mockRequest({});
            req.user = { oid: testUserId };
            const res = mockResponse();
            const next = vi.fn();
            const { router } = require('../src/routes/upload.route');
            const uploadRoute = router.stack.find((layer) => layer.route?.path === '/' && layer.route?.methods?.post);
            await uploadRoute.handle(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'No file uploaded',
            }));
        });
        it('should return 401 if user is not authenticated', async () => {
            const testFile = {
                ...mockFile,
                buffer: Buffer.from('test'),
                originalname: 'test.xlsx',
            };
            const req = mockRequest({}, testFile);
            // No need to set user, it's already undefined by default in mockRequest
            const res = mockResponse();
            const next = vi.fn();
            const { router } = require('../src/routes/upload.route');
            const uploadRoute = router.stack.find((layer) => layer.route?.path === '/' && layer.route?.methods?.post);
            await uploadRoute.handle(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Authentication required',
            }));
        });
        it('should handle file processing errors', async () => {
            // Mock XLSX.read to throw an error
            XLSX.read.mockImplementation(() => {
                throw new Error('Invalid Excel file');
            });
            const testFile = {
                ...mockFile,
                buffer: Buffer.from('invalid-excel'),
                originalname: 'test.xlsx',
            };
            const req = mockRequest({}, testFile);
            req.user = { oid: testUserId };
            const res = mockResponse();
            const next = vi.fn();
            const { router } = require('../src/routes/upload.route');
            const uploadRoute = router.stack.find((layer) => layer.route?.path === '/' && layer.route?.methods?.post);
            await uploadRoute.handle(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Failed to process Excel file. The file may be corrupted or in an unsupported format.',
            }));
        });
    });
});
