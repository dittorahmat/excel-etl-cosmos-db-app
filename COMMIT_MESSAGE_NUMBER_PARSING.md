feat: Implement number/float parsing for CSV and Excel files

This implementation adds automatic detection and parsing of numeric values in both Excel and CSV files:

1. Enhanced CSV parsing to detect and convert numeric strings with dot (.) as decimal separator to JavaScript Number objects
2. Verified Excel parsing already preserves native numeric types as JavaScript Number objects
3. Added helper methods for numeric string detection and parsing (isNumericString, parseNumericString, processCellValue)
4. Created comprehensive unit tests for the numeric parsing functionality
5. All tests pass successfully and project builds without TypeScript errors

The implementation maintains backward compatibility while enabling better querying capabilities in Cosmos DB by storing numeric values as native Number objects instead of strings.