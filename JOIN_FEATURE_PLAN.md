# JOIN Feature Implementation Plan

## Overview
This plan outlines the implementation of a JOIN feature for the Excel ETL Cosmos DB application. The feature will modify the `/api/query/rows` and `/api/query/rows-get` endpoints to combine data from multiple import IDs (files) that have matching special filter values, similar to a SQL JOIN operation.

## Requirements

### Current Behavior
- Currently, queries return data from a single import ID/file
- Only records from one file are returned at a time

### Desired Behavior
- When records from different files have matching special filter values (Source, Category, Sub Category, Year), join their data
- Combine all regular fields from matching files, using nulls for missing values
- Return special fields first, followed by all regular fields
- Handle files with different sets of regular fields

### JOIN Logic
- **Type**: FULL OUTER JOIN behavior based on special filter values
- **Join Keys**: Source, Category, Sub Category, Year
- **Result**: Combine regular fields from all files with matching special filter values
- **Null Handling**: Use null values where fields don't exist in specific files

## Implementation Approach

### 1. Query Structure Changes
- Modify endpoints to identify ALL import IDs with matching special filter values
- Create intermediate step to group records by special filter value combinations
- Merge records from different import IDs based on matching special filter values

### 2. Data Processing Pipeline
```
Step 1: Query all records matching special filter conditions
Step 2: Group records by special filter value combinations
Step 3: Within each group, merge records from different import IDs
Step 4: Fill missing fields with null values
Step 5: Format response with special fields first, then regular fields
```

### 3. API Endpoints to Update
- `/api/query/rows` (POST method)
- `/api/query/rows-get` (GET method)

### 4. Response Format Changes
```
Current: [
  {"Source": "ESDM", "Category": "Energy", "Sub Category": "Energy Price per Energy Unit", "Year": 2024, "Energy": 100, "Unit Price": 50}
]
Desired: [
  {
    "Source": "ESDM", 
    "Category": "Energy", 
    "Sub Category": "Energy Price per Energy Unit", 
    "Year": 2024, 
    "Energy": 100, 
    "Unit Price": 50,
    "Value": 200,           // From different file with same special filters
    "Append": "extra_data"  // From different file with same special filters
  }
]
```

## Technical Implementation

### 1. Query Modification
```typescript
// Instead of querying specific import ID
const query = `SELECT * FROM c WHERE c._importId = @importId AND ...`;

// Query all records matching special filters
const query = `SELECT * FROM c WHERE c.documentType = 'excel-row' AND ... 
               AND c["Source"] = @Source AND c["Category"] = @Category AND ...`;
```

### 2. Group and Merge Logic
```typescript
// Group records by special filter values
const groupedRecords = groupBy(records, ['Source', 'Category', 'Sub Category', 'Year']);

// For each group, merge records from different import IDs
const mergedGroup = mergeRecordsInGroup(group);
```

### 3. Field Combination
- Identify all unique field names across records in each group
- Create merged record with all fields
- Fill missing values with null

### 4. Performance Safeguards
- Maximum 50 files to join in a single query
- Maximum 10,000 total rows returned
- Pagination support for large result sets
- Query timeout handling

## Implementation Steps

### Phase 1: Analysis and Setup
1. Locate and examine current `/api/query/rows` and `/api/query/rows-get` endpoints
2. Understand current data structure and import ID usage
3. Identify special filter field names and storage format
4. Analyze existing response formatting logic

### Phase 2: Core JOIN Logic Development
1. Develop record grouping function based on special filter values
2. Create field combination logic with null filling
3. Implement performance safeguards (file limits, row limits)
4. Add pagination support

### Phase 3: Endpoint Updates
1. Update `/api/query/rows` (POST) with JOIN logic
2. Update `/api/query/rows-get` (GET) with JOIN logic
3. Ensure both endpoints share common JOIN logic
4. Maintain backward compatibility where possible

### Phase 4: Testing and Validation
1. Test with files having identical special filter values
2. Test with files having different regular fields
3. Test performance limits and pagination
4. Validate response format matches requirements

## Risk Assessment

### Potential Issues
1. **Performance**: Large number of matching records may cause memory or timeout issues
2. **Memory**: High memory usage when combining large datasets
3. **Complexity**: Complex logic to handle missing fields and merging
4. **Backward Compatibility**: Changes may affect existing clients

### Mitigation Strategies
1. **Performance**: Implement strict limits and monitoring
2. **Memory**: Use streaming/pagination for large results
3. **Complexity**: Thorough testing and clear documentation
4. **Compatibility**: Maintain option for original behavior if needed

## Testing Scenarios

### Test Case 1: Basic JOIN
- Two files with same special filter values but different regular fields
- Verify all fields are included with proper null values

### Test Case 2: Multiple Files
- Three or more files with same special filter values
- Verify data from all files is properly merged

### Test Case 3: No Matching Records
- Files with different special filter values
- Verify normal operation continues

### Test Case 4: Large Dataset
- Test performance limits and pagination
- Verify system doesn't timeout or crash

## Success Criteria
- JOIN operations work correctly for matching special filter values
- All regular fields from different files are included in results
- Missing values are properly filled with null
- Performance remains acceptable with reasonable limits
- Both API endpoints function correctly
- JOIN is now mandatory (always enabled) by default

## Rollback Plan
If issues arise, endpoints can be temporarily reverted to original behavior while fixes are implemented.