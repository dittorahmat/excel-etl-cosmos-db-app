import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import * as XLSX from 'xlsx';
import type { Request, Response, NextFunction } from 'express';

// Hoist the mock multer implementation
const mockMulter = vi.hoisted(() => {
  const single = vi.fn().mockReturnValue((req: Request, res: Response, next: NextFunction) => {
    next();
  });
  
  // Create the memoryStorage function
  const memoryStorage = vi.fn().mockReturnValue({});
  
  // Create the multer mock function with the correct type
  const multer = vi.fn().mockImplementation(() => ({
    single,
    memoryStorage: vi.fn().mockReturnValue({}),
  })) as any; // Use type assertion here
  
  // Add static memoryStorage property to the multer function
  multer.memoryStorage = memoryStorage;
  
  return { multer, single, memoryStorage };
});

// Mock multer module
vi.mock('multer', () => ({
  __esModule: true,
  default: mockMulter.multer,
  memoryStorage: mockMulter.memoryStorage,
}));

// Import the function from the upload route
import { processExcelFile } from '../src/utils/excelParser.js';

// Mock the modules
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
    decode_range: vi.fn(),
    encode_cell: vi.fn()
  }
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-123')
}));
