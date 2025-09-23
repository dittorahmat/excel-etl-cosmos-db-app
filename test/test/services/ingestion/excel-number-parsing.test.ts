import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileParserService } from '../../../../server/src/services/file-parser/file-parser.service.js';

describe('Excel Number Parsing Functionality', () => {
  it('should parse Excel numeric values as JavaScript numbers', async () => {
    // Create a test Excel file buffer with numeric values
    // Note: This is a simplified test that creates a mock Excel buffer
    // In a real implementation, we would use an actual Excel file
    
    // For this test, we'll create a simple buffer that simulates Excel data
    // This is a very basic test that verifies the file parser service can handle numbers
    
    // Create a mock Excel file with numeric data
    const mockExcelData = [
      ['product', 'price', 'quantity', 'discount', 'total'],
      ['Widget A', 19.99, 5, 0.1, 99.95],
      ['Widget B', 25.50, 3, 0.05, 72.68],
      ['Widget C', 10, 10, 0.0, 100]
    ];
    
    // We can't easily create a real Excel file in memory for testing
    // Instead, we'll test the processCellValue method directly
    
    // Test that numbers are preserved as numbers
    const result1 = (fileParserService as any).processCellValue(19.99);
    expect(result1).toBe(19.99);
    expect(typeof result1).toBe('number');
    
    const result2 = (fileParserService as any).processCellValue(25.50);
    expect(result2).toBe(25.5);
    expect(typeof result2).toBe('number');
    
    const result3 = (fileParserService as any).processCellValue(10);
    expect(result3).toBe(10);
    expect(typeof result3).toBe('number');
    
    // Test that strings that look like numbers are parsed as numbers
    const result4 = (fileParserService as any).processCellValue('19.99');
    expect(result4).toBe(19.99);
    expect(typeof result4).toBe('number');
    
    const result5 = (fileParserService as any).processCellValue('25.50');
    expect(result5).toBe(25.5);
    expect(typeof result5).toBe('number');
    
    const result6 = (fileParserService as any).processCellValue('10');
    expect(result6).toBe(10);
    expect(typeof result6).toBe('number');
    
    // Test that invalid numeric strings remain as strings
    const result7 = (fileParserService as any).processCellValue('19.99.99');
    expect(result7).toBe('19.99.99');
    expect(typeof result7).toBe('string');
    
    const result8 = (fileParserService as any).processCellValue('not-a-number');
    expect(result8).toBe('not-a-number');
    expect(typeof result8).toBe('string');
    
    // Test that empty strings remain as empty strings in processCellValue (since it's handled in CSV parser)
    const result9 = (fileParserService as any).processCellValue('');
    expect(result9).toBe('');
  });
});