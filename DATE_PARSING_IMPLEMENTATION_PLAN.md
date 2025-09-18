# Date Parsing Implementation Plan

## Overview
This document outlines the plan to implement automatic date detection and parsing in the ingestion service. Currently, all columns are mapped as strings regardless of their actual data type. This enhancement will detect date values in Excel files and parse date strings in CSV files with the format `dd-mm-yyyy`.

## Current State Analysis
The current ingestion service in `server/src/services/ingestion/ingestion.service.ts` processes all data as strings without any type detection or conversion. The service relies on `fileParserService` in `server/src/services/file-parser/file-parser.service.ts` to parse files.

Analysis of the file parser service reveals:
1. **Excel Parsing**: Uses `XLSX.utils.sheet_to_json()` with `raw: false`, which converts all values to formatted strings, losing type information including dates
2. **CSV Parsing**: Uses `csv-parser` library which treats all values as strings by default
3. Both parsers lose native date type information before data reaches the ingestion service

## Requirements
1. For Excel files:
   - Detect cells with date data types
   - Convert these to JavaScript Date objects for proper storage in Cosmos DB

2. For CSV files:
   - Parse strings matching the `dd-mm-yyyy` format with hyphens as separators
   - Convert valid date strings to JavaScript Date objects
   - Leave non-matching strings as strings

3. Maintain backward compatibility
4. Ensure proper error handling for invalid date formats

## Implementation Approach

### 1. Modify File Parser Service
The primary change needs to be in `file-parser.service.ts` to preserve date types:

#### Excel Parsing Changes:
```typescript
// In parseExcel method, change raw: false to raw: true
jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
  header: 1, // Get raw data including headers
  raw: true, // Changed from false to true to preserve data types
  defval: null, // Use null for empty cells
  blankrows: false,
});
```

#### CSV Parsing Changes:
```typescript
// In the csv-parser configuration, enhance the mapValues function:
mapValues: ({ value }: { value: string }) => {
  // Convert empty strings to null for consistency
  if (value === '') {
    return null;
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
 * Check if a string matches the dd-mm-yyyy date format
 * @param value The string to check
 * @returns True if the string matches the date format
 */
private isDateString(value: string): boolean {
  // Regular expression for dd-mm-yyyy format
  const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
  return dateRegex.test(value);
}

/**
 * Parse a date string in dd-mm-yyyy format
 * @param dateString The date string to parse
 * @returns A Date object or the original string if parsing fails
 */
private parseDateString(dateString: string): Date | string {
  try {
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      return dateString;
    }
    
    // Check that all parts exist
    if (parts[0] === undefined || parts[1] === undefined || parts[2] === undefined) {
      return dateString;
    }
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Check if all parts are valid numbers
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return dateString;
    }
    
    // Create date (month is 0-indexed in JavaScript)
    const date = new Date(year, month - 1, day);
    
    // Validate that the date is valid
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
    
    // Return original string if date is invalid
    return dateString;
  } catch (error) {
    // Return original string if parsing fails
    return dateString;
  }
}

/**
 * Process a cell value to ensure proper type handling
 * @param value The raw cell value
 * @returns The processed value with proper types
 */
private processCellValue(value: unknown): unknown {
  // For Excel, dates might come through as Date objects
  if (value instanceof Date) {
    return value;
  }
  
  // For strings that might be dates, we can add additional processing
  if (typeof value === 'string') {
    // Could add CSV-style date parsing here if needed
    return value;
  }
  
  return value;
}
```

### 3. Modify Ingestion Service Row Transformation
Update the ingestion service to handle the date values that will now be properly passed from the file parser:

```typescript
// In the transformRow function in ingestion.service.ts
transformRow: (row, rowIndex) => {
  // Add system fields to each row (date values are already processed by file parser)
  return {
    ...row,
    _importId: importId,
    _rowNumber: (rowIndex + 1).toString(), // 1-based index for user-friendly reporting
    _importedAt: new Date().toISOString(),
    _importedBy: userId,
  };
},
```

## Implementation Steps

### Phase 1: File Parser Service Modifications (COMPLETED)
1. ✅ Modify Excel parsing to preserve date types by changing `raw: false` to `raw: true`
2. ✅ Add CSV date string parsing logic to the CSV parser
3. ✅ Add helper methods for date detection and parsing
4. ✅ Add value processing for Excel data

### Phase 2: Ingestion Service Updates (COMPLETED)
1. ✅ Update ingestion service to properly handle Date objects from the file parser
2. ✅ Add any additional validation or logging for date values
3. ✅ Ensure Cosmos DB storage properly handles Date objects

### Phase 3: Testing and Validation (COMPLETED)
1. ✅ Create unit tests for date parsing functions in both services
2. ✅ Test with various Excel files containing date values
3. ✅ Test with CSV files containing date strings in dd-mm-yyyy format
4. ✅ Test edge cases and error conditions
5. ✅ Verify backward compatibility with existing data

## Considerations

### Backward Compatibility
- Existing data will remain unchanged
- New imports will have proper date types
- Queries that expect strings might need adjustment

### Error Handling
- Invalid date strings will remain as strings rather than throwing errors
- Malformed Excel dates will be handled gracefully
- Logging will be added for debugging date parsing issues

### Performance
- Date parsing will add minimal overhead to the ingestion process
- Preserving native Excel date types should actually improve performance
- Caching could be considered for frequently used date formats

### Validation
- Dates will be validated to ensure they represent real calendar dates
- Leap years and month lengths will be properly handled
- Invalid dates will gracefully fall back to string representation

## Impact on Cosmos DB Storage
- Date values will be stored as native Date objects in Cosmos DB
- This enables proper date querying and sorting
- Existing string dates will remain as strings until re-imported
- Cosmos DB's native date support will be leveraged for better querying capabilities

## Next Steps
1. ✅ Review this plan for completeness and accuracy
2. ✅ Approve the implementation approach
3. ✅ Begin implementation with Phase 1 (File Parser Service Modifications)
4. ✅ Successfully built the project with no TypeScript errors
5. ✅ Complete Phase 2 (Ingestion Service Updates)
6. ✅ Complete Phase 3 (Testing and Validation)
7. 🔲 Document the changes for future reference
8. 🔲 Consider any additional enhancements or optimizations