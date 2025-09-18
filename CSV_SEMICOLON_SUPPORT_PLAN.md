# Plan: Adding Semicolon-Separated CSV Support with Auto-Detection

## Overview
This document outlines the changes needed to extend the ingestion service to support auto-detection of CSV delimiters, allowing the system to handle both comma-separated and semicolon-separated CSV files automatically without requiring different file extensions.

## Current Implementation Analysis

### File Type Detection
Currently, the ingestion service determines file type based on the `fileType` parameter passed to the `startImport` method. This parameter is likely derived from the file extension or MIME type.

### File Parsing
The actual parsing is handled by `fileParserService.parseFile()` which:
1. Receives the file path and file type
2. Uses different parsing logic based on file type
3. For CSV files, it uses the `csv-parser` library with a hardcoded comma delimiter
4. Returns parsed data with headers, rows, and error information

## Proposed Changes

### 1. Auto-Detect CSV Delimiter
Instead of hardcoding the comma delimiter, we'll implement automatic delimiter detection:
- Read the first few lines of the CSV file
- Analyze the content to determine the most likely delimiter
- Use the detected delimiter for parsing

### 2. Update File Parser Service
Modify `fileParserService.parseFile()` and add a new `detectDelimiter` method:
- Add a function to detect the CSV delimiter by analyzing the file content
- Update the CSV parsing logic to use the detected delimiter
- Maintain all existing functionality for Excel files

### 3. Update Ingestion Service
The ingestion service will not require major changes since it delegates parsing to the file parser service.

### 4. Testing
Add tests to verify:
- Correct detection of comma-separated CSV files
- Correct detection of semicolon-separated CSV files
- Proper parsing of both file types
- Handling of edge cases (mixed delimiters, escaped characters, etc.)

## Implementation Steps

### Step 1: Add Delimiter Detection Function
- Create a new utility function to detect CSV delimiters
- Implement logic to analyze the first few lines of a file
- Count occurrences of potential delimiters (comma, semicolon, tab)
- Return the delimiter with the most consistent count across lines

### Step 2: Modify File Parser Service
- Update `parseCsv` method to use the detected delimiter
- Add the new `detectDelimiter` method
- Ensure proper handling of quoted fields and escaping regardless of delimiter

### Step 3: Update Ingestion Service (if needed)
- Verify that the ingestion service properly handles the updated parser output
- Update any logging to reflect the detected delimiter

### Step 4: Update Documentation
- Update any relevant documentation or comments
- Add examples of usage with different delimiter types

### Step 5: Testing
- Add unit tests for delimiter detection functionality
- Add integration tests for parsing files with different delimiters
- Verify existing functionality still works
- Test edge cases and error conditions

## Technical Approach

### Delimiter Detection Algorithm
1. Read the first 1-3 lines of the file
2. Count occurrences of potential delimiters: comma (`,`), semicolon (`;`), and tab (`\t`)
3. For each line, determine which delimiter appears most consistently
4. Select the delimiter that appears most consistently across all sampled lines
5. Handle edge cases:
   - Files with only headers
   - Files with escaped delimiters within quotes
   - Files with inconsistent delimiters

### Implementation Details
The `csv-parser` library we're currently using supports custom delimiters through the `separator` option. We'll:
1. Create a function that reads the beginning of the file
2. Analyze the content to determine the delimiter
3. Pass the detected delimiter to `csv-parser`

## Risk Assessment

### Low Risk
- Backward compatibility will be maintained (comma-separated CSVs will still work)
- Changes are isolated to parsing logic
- No database schema changes required

### Medium Risk
- Potential issues with delimiter detection in files that have inconsistent delimiters
- Performance impact of reading files twice (once for detection, once for parsing)
- Need to ensure proper escaping is handled with all delimiter types

### High Risk
- None identified at this time

## Dependencies
- The `csv-parser` library already supports custom delimiters via the `separator` option
- Need to verify that all existing tests still pass after changes

## Rollout Plan
1. Implement delimiter detection in development environment
2. Run full test suite with additional tests for delimiter detection
3. Test with real CSV files of both types
4. Deploy to staging environment for testing
5. Deploy to production with monitoring

## Edge Cases to Handle

1. **Files with mixed delimiters**: Some lines might have different numbers of commas vs semicolons
2. **Files with delimiters in quoted fields**: Need to properly parse quoted content
3. **Files with only headers**: Should still detect delimiter correctly
4. **Empty files**: Should handle gracefully
5. **Files with escaped quotes containing delimiters**: Proper CSV escaping should be respected
6. **Files with tab delimiters**: Though not requested, we could extend to detect these as well