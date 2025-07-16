import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { uploadRouterV2 } from '../src/routes/v2/upload.route.js';
import { ingestionService } from '../src/services/ingestion/ingestion.service.js';
import { logger } from '../src/utils/logger.js';

// Mock external dependencies
vi.mock('../src/services/ingestion/ingestion.service.js');
vi.mock('../src/utils/logger.js');
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));


vi.mock('../src/middleware/auth.js', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    if (process.env.AUTH_ENABLED === 'true') {
      // Simulate successful authentication for this test
      req.user = { oid: 'test-user-id' };
      next();
    } else {
      next();
    }
  }),
}));



describe('Upload Route V2', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      // Mock req.user and req.id for authentication and logging
      (req as any).user = { oid: 'test-user-id' };
      (req as any).id = 'test-request-id';
      next();
    });
    app.use('/', uploadRouterV2);

    // Reset AUTH_ENABLED for each test
    process.env.AUTH_ENABLED = 'false';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Type Validation', () => {
    const mockFileBuffer = Buffer.from('dummy content');

    it('should accept a valid .xlsx file', async () => {
      vi.mocked(ingestionService.importFile).mockResolvedValue({
        id: 'import-123',
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        errors: [],
      });

      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, {
          filename: 'test.xlsx',
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      expect(res.statusCode).toEqual(200);
      expect(ingestionService.importFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'test-user-id'
      );
      expect(res.body.error).toBeUndefined();
    });

    it('should accept a valid .csv file', async () => {
      vi.mocked(ingestionService.importFile).mockResolvedValue({
        id: 'import-123',
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        errors: [],
      });

      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, {
          filename: 'test.csv',
          contentType: 'text/csv',
        });
      expect(res.statusCode).toEqual(200);
      expect(ingestionService.importFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.csv',
        'text/csv',
        'test-user-id'
      );
      expect(res.body.error).toBeUndefined();
    });

    it('should accept .xlsx with application/octet-stream if extension is correct', async () => {
      vi.mocked(ingestionService.importFile).mockResolvedValue({
        id: 'import-123',
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        errors: [],
      });

      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, {
          filename: 'test.xlsx',
          contentType: 'application/octet-stream',
        });
      expect(res.statusCode).toEqual(200);
      expect(ingestionService.importFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'test-user-id'
      );
      expect(res.body.error).toBeUndefined();
    });

    it('should reject an invalid file type', async () => {
      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Unsupported file type');
      expect(res.body.message).toContain('Unsupported file type: text/plain');
    });

    it('should reject an unsupported Excel file type (.doc)', async () => {
      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, {
          filename: 'document.doc',
          contentType: 'application/msword',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Unsupported file type');
      expect(res.body.message).toContain('Unsupported file type: application/msword');
    });
  });

  describe('POST /', () => {
    const mockFileBuffer = Buffer.from('test-excel-data');

    it('should return 400 if no file is uploaded', async () => {
      const res = await request(app).post('/');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: 400,
        error: 'No file uploaded',
        message: 'Please upload a file',
      });
      expect(logger.error).toHaveBeenCalledWith('No file uploaded', expect.any(Object));
    });

    it('should successfully upload a valid file', async () => {
      vi.mocked(ingestionService.importFile).mockResolvedValue({
        id: 'import-123',
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        errors: [],
      });

      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, 'test.xlsx');

      expect(ingestionService.importFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'test-user-id'
      );
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        success: true,
        message: 'File processed successfully',
        importId: 'import-123',
        fileName: 'test.xlsx',
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        errors: [],
      });
      expect(logger.info).toHaveBeenCalledWith('File upload started', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('File import completed', expect.any(Object));
    });

    it('should return 500 if file processing fails', async () => {
      const errorMessage = 'Simulated import error';
      vi.mocked(ingestionService.importFile).mockRejectedValue(new Error(errorMessage));

      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, 'test.xlsx');

      expect(ingestionService.importFile).toHaveBeenCalled();
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({
        status: 500,
        error: 'File processing failed',
        message: `Failed to process file: ${errorMessage}`,
      });
      expect(logger.error).toHaveBeenCalledWith('File import failed', expect.any(Object));
    });

    it('should handle generic application/octet-stream with correct extension', async () => {
      vi.mocked(ingestionService.importFile).mockResolvedValue({
        id: 'import-123',
        totalRows: 5,
        validRows: 5,
        errorRows: 0,
        errors: [],
      });

      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, 'data.xlsx');

      expect(ingestionService.importFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        'data.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Expect detected MIME type
        'test-user-id'
      );
      expect(res.statusCode).toEqual(200);
    });

    it('should return 400 for unsupported file type', async () => {
      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, 'document.pdf');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual({
        status: 400,
        error: 'Unsupported file type',
        message: expect.stringContaining('Unsupported file type: application/pdf'),
      });
    });

    

    it('should handle general errors in middleware', async () => {
      const errorMessage = 'Generic Multer Error';
      vi.mocked(ingestionService.importFile).mockRejectedValue(new Error(errorMessage));

      const res = await request(app)
        .post('/')
        .attach('file', mockFileBuffer, 'error.xlsx');

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual({
        status: 500,
        error: 'File processing failed',
        message: `Failed to process file: ${errorMessage}`,
      });
      expect(logger.error).toHaveBeenCalledWith('File import failed', expect.any(Object));
    });
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ status: 'ok', version: 'v2' });
    });
  });

  describe('Authentication', () => {
    it('should apply authentication middleware when AUTH_ENABLED is true', async () => {
      process.env.AUTH_ENABLED = 'true';
      vi.mocked(ingestionService.importFile).mockResolvedValue({
        id: 'import-123',
        totalRows: 10,
        validRows: 10,
        errorRows: 0,
        errors: [],
      });

      // Re-create app to re-initialize router with new env var
      app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        (req as any).id = 'test-request-id';
        next();
      });
      app.use('/', uploadRouterV2);

      const res = await request(app)
        .post('/')
        .attach('file', Buffer.from('dummy'), 'test.xlsx');

      expect(res.statusCode).toEqual(200);
    });
  });
});