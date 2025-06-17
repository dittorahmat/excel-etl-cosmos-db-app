import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import express from 'express';
// Mock the server module
vi.mock('../src/server.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        createApp: vi.fn().mockImplementation(() => {
            const app = express();
            // Mock routes for testing
            app.get('/health', (req, res) => {
                res.json({ status: 'ok', environment: 'test' });
            });
            // Add more mock routes as needed
            return app;
        }),
    };
});
// Mock the Azure services
const mockAzureServices = {
    database: {
        container: vi.fn().mockReturnValue({
            items: {
                query: vi.fn().mockResolvedValue({ resources: [] }),
                create: vi.fn().mockResolvedValue({ resource: { id: 'test-id' } }),
                read: vi.fn(),
                upsert: vi.fn(),
                delete: vi.fn(),
            },
        }),
    },
};
// Mock the azure module
vi.mock('../src/config/azure.js', () => ({
    initializeBlobStorage: vi.fn().mockResolvedValue({
        blobServiceClient: {
            getContainerClient: vi.fn().mockReturnValue({
                createIfNotExists: vi.fn().mockResolvedValue({}),
                getBlockBlobClient: vi.fn().mockReturnValue({
                    uploadData: vi.fn().mockResolvedValue({}),
                    download: vi.fn().mockResolvedValue({ readableStreamBody: { pipe: vi.fn() } }),
                }),
            }),
        },
    }),
    initializeCosmosDB: vi.fn().mockResolvedValue(mockAzureServices),
    getAzureServices: vi.fn().mockReturnValue(mockAzureServices),
}));
// Import the createApp after setting up the mocks
import { createApp } from '../src/server.js';
describe('Server', () => {
    let app;
    const mockRequest = request.agent('http://localhost:3000');
    beforeAll(async () => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        // Create a fresh app instance for testing
        app = createApp();
        // Start the server on a test port if needed
        if (!app.listening) {
            await new Promise((resolve) => {
                app.listen(3000, () => {
                    console.log('Test server running on port 3000');
                    resolve();
                });
            });
        }
    });
    afterAll(() => {
        // Clean up after all tests
        vi.clearAllMocks();
        vi.resetModules();
        // Close the server if it's running
        if (app.listening) {
            app.close();
        }
    });
    afterEach(() => {
        // Reset all mocks after each test
        vi.clearAllMocks();
    });
    describe('Health Check', () => {
        it('should return 200 and status ok for /health endpoint', async () => {
            const response = await mockRequest.get('/health');
            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'ok',
                environment: 'test'
            });
        });
        it('should include environment information in the response', async () => {
            const response = await mockRequest.get('/health');
            expect(response.body).toHaveProperty('environment');
            expect(typeof response.body.environment).toBe('string');
        });
    });
    describe('404 Handler', () => {
        it('should return 404 for non-existent routes', async () => {
            const response = await mockRequest.get('/non-existent-route');
            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                success: false,
                error: 'Not Found'
            });
        });
        it('should handle various HTTP methods for non-existent routes', async () => {
            const methods = ['get', 'post', 'put', 'delete'];
            for (const method of methods) {
                const response = await mockRequest[method]('/non-existent-endpoint');
                expect(response.status).toBe(404);
            }
        });
    });
    describe('Error Handling', () => {
        it('should return 500 for unhandled errors', async () => {
            // Mock a route that throws an error
            app.get('/error-route', () => {
                throw new Error('Test error');
            });
            const response = await mockRequest.get('/error-route');
            expect(response.status).toBe(500);
            expect(response.body).toEqual({
                success: false,
                error: 'Internal Server Error'
            });
        });
    });
});
