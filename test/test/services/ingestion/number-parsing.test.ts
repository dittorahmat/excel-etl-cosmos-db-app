import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileParserService } from '../../../../server/src/services/file-parser/file-parser.service.js';

describe('Number Parsing Functionality', () => {
  it('should parse CSV numeric strings with dot as decimal separator', async () => {
    // Create a test CSV file with numeric values
    const csvContent = `product,price,quantity,discount,total
Widget A,19.99,5,0.1,99.95
Widget B,25.50,3,0.05,72.68
Widget C,10,10,0.0,100`;
    
    // Create a temporary file
    const tempDir = '/tmp';
    const csvFileName = `test-numeric-parsing-${uuidv4()}.csv`;
    const csvFilePath = path.join(tempDir, csvFileName);
    
    try {
      // Write the CSV content to a temporary file
      await fs.writeFile(csvFilePath, csvContent);
      
      // Parse the CSV file
      const result = await fileParserService.parseFile(csvFilePath, 'text/csv');
      
      // Check that we have the correct number of rows
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(3);
      expect(result.headers).toEqual(['product', 'price', 'quantity', 'discount', 'total']);
      
      // Check that the numeric strings have been parsed as Number objects
      expect(result.rows).toHaveLength(3);
      
      // Check first row
      const firstRow = result.rows[0];
      expect(firstRow.product).toBe('Widget A');
      expect(firstRow.price).toBe(19.99); // Should be a number
      expect(typeof firstRow.price).toBe('number');
      expect(firstRow.quantity).toBe(5); // Should be a number
      expect(typeof firstRow.quantity).toBe('number');
      expect(firstRow.discount).toBe(0.1); // Should be a number
      expect(typeof firstRow.discount).toBe('number');
      expect(firstRow.total).toBe(99.95); // Should be a number
      expect(typeof firstRow.total).toBe('number');
      
      // Check second row
      const secondRow = result.rows[1];
      expect(secondRow.product).toBe('Widget B');
      expect(secondRow.price).toBe(25.5); // Should be a number
      expect(typeof secondRow.price).toBe('number');
      expect(secondRow.quantity).toBe(3); // Should be a number
      expect(typeof secondRow.quantity).toBe('number');
      expect(secondRow.discount).toBe(0.05); // Should be a number
      expect(typeof secondRow.discount).toBe('number');
      expect(secondRow.total).toBe(72.68); // Should be a number
      expect(typeof secondRow.total).toBe('number');
      
      // Check third row
      const thirdRow = result.rows[2];
      expect(thirdRow.product).toBe('Widget C');
      expect(thirdRow.price).toBe(10); // Should be a number
      expect(typeof thirdRow.price).toBe('number');
      expect(thirdRow.quantity).toBe(10); // Should be a number
      expect(typeof thirdRow.quantity).toBe('number');
      expect(thirdRow.discount).toBe(0); // Should be a number
      expect(typeof thirdRow.discount).toBe('number');
      expect(thirdRow.total).toBe(100); // Should be a number
      expect(typeof thirdRow.total).toBe('number');
      
    } finally {
      // Clean up the temporary file
      try {
        await fs.unlink(csvFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
  
  it('should leave invalid numeric strings as strings', async () => {
    // Create a test CSV file with invalid numeric values
    const csvContent = `product,price,quantity
Widget A,19.99.99,5
Widget B,not-a-number,abc
Widget C,,10`;
    
    // Create a temporary file
    const tempDir = '/tmp';
    const csvFileName = `test-invalid-numeric-parsing-${uuidv4()}.csv`;
    const csvFilePath = path.join(tempDir, csvFileName);
    
    try {
      // Write the CSV content to a temporary file
      await fs.writeFile(csvFilePath, csvContent);
      
      // Parse the CSV file
      const result = await fileParserService.parseFile(csvFilePath, 'text/csv');
      
      // Check that we have the correct number of rows
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(3);
      expect(result.headers).toEqual(['product', 'price', 'quantity']);
      
      // Check that the invalid numeric strings remain as strings
      expect(result.rows).toHaveLength(3);
      
      // Check first row - invalid numeric should remain as string
      const firstRow = result.rows[0];
      expect(firstRow.product).toBe('Widget A');
      expect(firstRow.price).toBe('19.99.99'); // Invalid format should remain as string
      expect(typeof firstRow.price).toBe('string');
      expect(firstRow.quantity).toBe(5); // Valid number should be parsed
      expect(typeof firstRow.quantity).toBe('number');
      
      // Check second row - non-numeric string should remain as string
      const secondRow = result.rows[1];
      expect(secondRow.product).toBe('Widget B');
      expect(secondRow.price).toBe('not-a-number'); // Non-numeric should remain as string
      expect(typeof secondRow.price).toBe('string');
      expect(secondRow.quantity).toBe('abc'); // Non-numeric should remain as string
      expect(typeof secondRow.quantity).toBe('string');
      
      // Check third row - empty string should become null
      const thirdRow = result.rows[2];
      expect(thirdRow.product).toBe('Widget C');
      expect(thirdRow.price).toBeNull(); // Empty string should become null
      expect(thirdRow.quantity).toBe(10); // Valid number should be parsed
      expect(typeof thirdRow.quantity).toBe('number');
      
    } finally {
      // Clean up the temporary file
      try {
        await fs.unlink(csvFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
});