# Number/Float Parsing Implementation Plan

## Overview
This document outlines the plan to implement automatic number/float detection and parsing in the ingestion service. Currently, all columns are mapped as strings regardless of their actual data type. This enhancement will detect number/float values in Excel files and parse number/float strings in CSV files.

## Current State Analysis
The current ingestion service in `server/src/services/ingestion/ingestion.service.ts` processes all data as strings without any type detection or conversion. The service relies on `fileParserService` in `server/src/services/file-parser/file-parser.service.ts` to parse files.

Analysis of the file parser service reveals:
1. **Excel Parsing**: Uses `XLSX.utils.sheet_to_json()` with `raw: true` (after our date implementation) to preserve native data types
2. **CSV Parsing**: Uses `csv-parser` library which treats all values as strings by default
3. Both parsers may lose native number/float type information before data reaches the ingestion service

## Requirements
1. For Excel files:
   - Detect cells with numeric data types (integer and float)
   - Convert these to JavaScript Number objects for proper storage in Cosmos DB

2. For CSV files:
   - Parse strings matching numeric formats with dot (.) as decimal separator
   - Convert valid numeric strings to JavaScript Number objects
   - Leave non-matching strings as strings

3. Maintain backward compatibility
4. Ensure proper error handling for invalid numeric formats

## Implementation Approach

### 1. Modify File Parser Service
The primary change needs to be in `file-parser.service.ts` to preserve and detect numeric types:

#### Excel Parsing Changes:
The current implementation with `raw: true` should already preserve Excel numeric values as JavaScript numbers, but we should verify this works correctly.

#### CSV Parsing Changes:
```typescript
// In the csv-parser configuration, enhance the mapValues function:
mapValues: ({ value }: { value: string }) => {
  // Convert empty strings to null for consistency
  if (value === '') {
    return null;
  }
  
  // Try to parse as number first
  if (this.isNumericString(value)) {
    return this.parseNumericString(value);
  }
  
  // Try to parse as date if it matches our format
  if (this.isDateString(value)) {
    return this.parseDateString(value);
  }
  
  return value;
}
```

### 2. Add Helper Methods to File Parser Service
Add these methods to `FileParserService` class:

```typescript
/**
 * Check if a string represents a numeric value
 * @param value The string to check
 * @returns True if the string represents a valid number
 */
private isNumericString(value: string): boolean {
  // Regular expression for numeric values (integer or float with dot as decimal separator)
  const numericRegex = /^-?\d+(\.\d+)?$/;
  return numericRegex.test(value);
}

/**
 * Parse a numeric string
 * @param numericString The numeric string to parse
 * @returns A Number object or the original string if parsing fails
 */
private parseNumericString(numericString: string): number | string {
  try {
    const num = parseFloat(numericString);
    
    // Check if the parsed number is valid and matches the original string
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
    
    // Return original string if number is invalid
    return numericString;
  } catch (error) {
    // Return original string if parsing fails
    return numericString;
  }
}

/**
 * Process a cell value to ensure proper type handling
 * @param value The raw cell value
 * @returns The processed value with proper types
 */
private processCellValue(value: unknown): unknown {
  // For Excel, numbers might come through as Number objects
  if (typeof value === 'number') {
    return value;
  }
  
  // For dates (already implemented)
  if (value instanceof Date) {
    return value;
  }
  
  // For strings that might be numbers
  if (typeof value === 'string') {
    // Try to parse as number first
    if (this.isNumericString(value)) {
      return this.parseNumericString(value);
    }
    
    // Try to parse as date (already implemented)
    if (this.isDateString(value)) {
      return this.parseDateString(value);
    }
    
    return value;
  }
  
  return value;
}
```

### 3. Update Excel Processing Logic
Ensure Excel cell values are processed correctly:

```typescript
// In the Excel row processing loop:
// Map each cell to its header
for (let j = 0; j < Math.min(headers.length, rowData.length); j++) {
  const header = headers[j];
  const value = rowData[j];
  if (header && value !== null && value !== undefined && value !== '') {
    row[header] = this.processCellValue(value);
    isEmpty = false;
  }
}
```

## Implementation Steps

### Phase 1: File Parser Service Modifications (COMPLETED)
1. ✅ Add numeric string detection and parsing logic to CSV parser
2. ✅ Add helper methods for numeric detection and parsing
3. ✅ Update value processing for both CSV and Excel data
4. ✅ Verify Excel numeric values are preserved correctly

### Phase 2: Ingestion Service Updates
1. Update ingestion service to properly handle Number objects from the file parser
2. Add any additional validation or logging for numeric values
3. Ensure Cosmos DB storage properly handles Number objects

### Phase 3: Testing and Validation
1. Create unit tests for numeric parsing functions in both services
2. Test with various Excel files containing numeric values
3. Test with CSV files containing numeric strings with dot as decimal separator
4. Test edge cases and error conditions
5. Verify backward compatibility with existing data

## Considerations

### Backward Compatibility
- Existing data will remain unchanged
- New imports will have proper numeric types
- Queries that expect strings might need adjustment

### Error Handling
- Invalid numeric strings will remain as strings rather than throwing errors
- Malformed Excel numbers will be handled gracefully
- Logging will be added for debugging numeric parsing issues

### Performance
- Numeric parsing will add minimal overhead to the ingestion process
- Preserving native Excel numeric types should actually improve performance
- Caching could be considered for frequently used numeric formats

### Validation
- Numbers will be validated to ensure they represent valid numeric values
- Special values like Infinity and NaN will be handled appropriately
- Invalid numbers will gracefully fall back to string representation

## Impact on Cosmos DB Storage
- Numeric values will be stored as native Number objects in Cosmos DB
- This enables proper numeric querying, sorting, and mathematical operations
- Existing string numbers will remain as strings until re-imported
- Cosmos DB's native numeric support will be leveraged for better querying capabilities

## Next Steps
1. ✅ Review this plan for completeness and accuracy
2. ✅ Approve the implementation approach
3. ✅ Begin implementation with Phase 1 (File Parser Service Modifications)
4. ✅ Successfully built the project with no TypeScript errors
5. ✅ Successfully tested with comprehensive test suite including decimal values
6. 🔲 Proceed with subsequent phases