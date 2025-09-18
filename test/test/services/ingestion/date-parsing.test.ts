import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileParserService } from '../../../../server/src/services/file-parser/file-parser.service';

describe('Date Parsing Functionality', () => {
  it('should parse CSV date strings in dd-mm-yyyy format', async () => {
    // Create a test CSV file with date values
    const csvContent = `name,date_of_birth,salary,department
John Doe,15-03-1990,50000,Engineering
Jane Smith,22-07-1985,60000,Marketing
Bob Johnson,05-12-1992,55000,Sales`;
    
    // Create a temporary file
    const tempDir = '/tmp';
    const csvFileName = `test-date-parsing-${uuidv4()}.csv`;
    const csvFilePath = path.join(tempDir, csvFileName);
    
    try {
      // Write the CSV content to a temporary file
      await fs.writeFile(csvFilePath, csvContent);
      
      // Parse the CSV file
      const result = await fileParserService.parseFile(csvFilePath, 'text/csv');
      
      // Check that we have the correct number of rows
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(3);
      expect(result.headers).toEqual(['name', 'date_of_birth', 'salary', 'department']);
      
      // Check that the date strings have been parsed as Date objects
      expect(result.rows).toHaveLength(3);
      
      // Check first row
      const firstRow = result.rows[0];
      expect(firstRow.name).toBe('John Doe');
      expect(firstRow.date_of_birth).toBeInstanceOf(Date);
      expect((firstRow.date_of_birth as Date).getFullYear()).toBe(1990);
      expect((firstRow.date_of_birth as Date).getMonth()).toBe(2); // March is 2 (0-indexed)
      expect((firstRow.date_of_birth as Date).getDate()).toBe(15);
      expect(firstRow.salary).toBe(50000); // Should be a number now
      expect(typeof firstRow.salary).toBe('number');
      expect(firstRow.department).toBe('Engineering');
      
      // Check second row
      const secondRow = result.rows[1];
      expect(secondRow.name).toBe('Jane Smith');
      expect(secondRow.date_of_birth).toBeInstanceOf(Date);
      expect((secondRow.date_of_birth as Date).getFullYear()).toBe(1985);
      expect((secondRow.date_of_birth as Date).getMonth()).toBe(6); // July is 6 (0-indexed)
      expect((secondRow.date_of_birth as Date).getDate()).toBe(22);
      expect(secondRow.salary).toBe(60000); // Should be a number now
      expect(typeof secondRow.salary).toBe('number');
      expect(secondRow.department).toBe('Marketing');
      
      // Check third row
      const thirdRow = result.rows[2];
      expect(thirdRow.name).toBe('Bob Johnson');
      expect(thirdRow.date_of_birth).toBeInstanceOf(Date);
      expect((thirdRow.date_of_birth as Date).getFullYear()).toBe(1992);
      expect((thirdRow.date_of_birth as Date).getMonth()).toBe(11); // December is 11 (0-indexed)
      expect((thirdRow.date_of_birth as Date).getDate()).toBe(5);
      expect(thirdRow.salary).toBe(55000); // Should be a number now
      expect(typeof thirdRow.salary).toBe('number');
      expect(thirdRow.department).toBe('Sales');
      
    } finally {
      // Clean up the temporary file
      try {
        await fs.unlink(csvFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
  
  it('should leave invalid date strings as strings', async () => {
    // Create a test CSV file with invalid date values
    const csvContent = `name,date_of_birth,salary
John Doe,32-13-1990,50000
Jane Smith,not-a-date,60000`;
    
    // Create a temporary file
    const tempDir = '/tmp';
    const csvFileName = `test-invalid-date-parsing-${uuidv4()}.csv`;
    const csvFilePath = path.join(tempDir, csvFileName);
    
    try {
      // Write the CSV content to a temporary file
      await fs.writeFile(csvFilePath, csvContent);
      
      // Parse the CSV file
      const result = await fileParserService.parseFile(csvFilePath, 'text/csv');
      
      // Check that we have the correct number of rows
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.headers).toEqual(['name', 'date_of_birth', 'salary']);
      
      // Check that the invalid date strings remain as strings
      expect(result.rows).toHaveLength(2);
      
      // Check first row - invalid date should remain as string
      const firstRow = result.rows[0];
      expect(firstRow.name).toBe('John Doe');
      expect(firstRow.date_of_birth).toBe('32-13-1990');
      expect(firstRow.salary).toBe(50000); // Should be a number now
      expect(typeof firstRow.salary).toBe('number');
      
      // Check second row - non-date string should remain as string
      const secondRow = result.rows[1];
      expect(secondRow.name).toBe('Jane Smith');
      expect(secondRow.date_of_birth).toBe('not-a-date');
      expect(secondRow.salary).toBe(60000); // Should be a number now
      expect(typeof secondRow.salary).toBe('number');
      
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

describe('Numeric Parsing Functionality', () => {
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
  
  it('should handle decimal values correctly', async () => {
    // Create a test CSV file with various decimal formats
    const csvContent = `item,value1,value2,value3
Test1,2.75,3.89,0.5
Test2,100.0,0.99,123.456
Test3,0.1,0.01,0.001`;
    
    // Create a temporary file
    const tempDir = '/tmp';
    const csvFileName = `test-decimal-parsing-${uuidv4()}.csv`;
    const csvFilePath = path.join(tempDir, csvFileName);
    
    try {
      // Write the CSV content to a temporary file
      await fs.writeFile(csvFilePath, csvContent);
      
      // Parse the CSV file
      const result = await fileParserService.parseFile(csvFilePath, 'text/csv');
      
      // Check that we have the correct number of rows
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(3);
      expect(result.headers).toEqual(['item', 'value1', 'value2', 'value3']);
      
      // Check that the decimal values have been parsed correctly
      expect(result.rows).toHaveLength(3);
      
      // Check first row
      const firstRow = result.rows[0];
      expect(firstRow.item).toBe('Test1');
      expect(firstRow.value1).toBe(2.75);
      expect(firstRow.value2).toBe(3.89);
      expect(firstRow.value3).toBe(0.5);
      
      // Check second row
      const secondRow = result.rows[1];
      expect(secondRow.item).toBe('Test2');
      expect(secondRow.value1).toBe(100.0);
      expect(secondRow.value2).toBe(0.99);
      expect(secondRow.value3).toBe(123.456);
      
      // Check third row
      const thirdRow = result.rows[2];
      expect(thirdRow.item).toBe('Test3');
      expect(thirdRow.value1).toBe(0.1);
      expect(thirdRow.value2).toBe(0.01);
      expect(thirdRow.value3).toBe(0.001);
      
      // Verify all values are numbers
      result.rows.forEach(row => {
        expect(typeof row.value1).toBe('number');
        expect(typeof row.value2).toBe('number');
        expect(typeof row.value3).toBe('number');
      });
      
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