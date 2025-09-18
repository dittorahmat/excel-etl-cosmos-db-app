import { describe, it, expect } from 'vitest';
import { detectCsvDelimiter } from '../../../server/src/utils/csv-delimiter-detector.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('detectCsvDelimiter', () => {
  const testFilesDir = path.join(process.cwd(), 'server', 'test-files');

  beforeAll(async () => {
    // Create test files directory if it doesn't exist
    try {
      await fs.mkdir(testFilesDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  it('should detect comma as delimiter in comma-separated CSV', async () => {
    const csvContent = `name,age,city
John,25,New York
Jane,30,Boston
Bob,35,Chicago`;

    const testFile = path.join(testFilesDir, 'comma_test.csv');
    await fs.writeFile(testFile, csvContent);

    const delimiter = await detectCsvDelimiter(testFile);
    expect(delimiter).toBe(',');

    // Clean up
    await fs.unlink(testFile);
  });

  it('should detect semicolon as delimiter in semicolon-separated CSV', async () => {
    const csvContent = `name;age;city
John;25;New York
Jane;30;Boston
Bob;35;Chicago`;

    const testFile = path.join(testFilesDir, 'semicolon_test.csv');
    await fs.writeFile(testFile, csvContent);

    const delimiter = await detectCsvDelimiter(testFile);
    expect(delimiter).toBe(';');

    // Clean up
    await fs.unlink(testFile);
  });

  it('should handle quoted fields correctly', async () => {
    const csvContent = `name;age;city
"John, Doe";25;"New York, NY"
"Jane; Smith";30;Boston
Bob;35;Chicago`;

    const testFile = path.join(testFilesDir, 'quoted_fields_test.csv');
    await fs.writeFile(testFile, csvContent);

    const delimiter = await detectCsvDelimiter(testFile);
    expect(delimiter).toBe(';');

    // Clean up
    await fs.unlink(testFile);
  });

  it('should default to comma for empty files', async () => {
    const csvContent = '';

    const testFile = path.join(testFilesDir, 'empty_test.csv');
    await fs.writeFile(testFile, csvContent);

    const delimiter = await detectCsvDelimiter(testFile);
    expect(delimiter).toBe(',');

    // Clean up
    await fs.unlink(testFile);
  });
});