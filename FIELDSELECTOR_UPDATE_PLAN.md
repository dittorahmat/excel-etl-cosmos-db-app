# FieldSelector Component Update Plan - COMPLETED

## Overview
This plan outlines the changes implemented to update the FieldSelector component to:
1. ✅ Exclude 4 specific fields (Source, Category, Sub Category, Year) from the main dropdown
2. ✅ Create separate filter controls for these 4 fields above the main dropdown
3. ✅ Implement special dropdowns for the 4 fields with distinct values from Cosmos DB
4. ✅ Automatically include these 4 special fields in query results by default (they are automatically selected)
5. ✅ Implement cascading filter logic (Source → Category → Sub Category → Year)
6. ✅ Enable dynamic field selection based on special filter selections
7. ✅ Properly handle field data types (especially Year as numbers vs strings)
8. ✅ Exclude metadata fields from results
9. ✅ Enhance error handling to prevent dummy data fallback
10. ✅ Implement robust field extraction to find fields across all matching records (not just first 100)

## Implementation Steps - COMPLETED

### ✅ Step 1: Create API Endpoint for Distinct Values
- The `/api/distinct-values` endpoint already existed and was enhanced to fetch distinct values for specified fields
- The endpoint accepts a `fields` query parameter with comma-separated field names
- The endpoint returns distinct values for each requested field
- Handles special case for Year field (ensures numeric values)

### ✅ Step 2: Update FieldSelector Component
- Added new state variables to manage the values for the 4 special fields
- Added logic to fetch distinct values for the 4 special fields on component mount
- Created separate dropdown components for:
  - Source, Category & Sub Category: Single dropdown choice with grouped options
  - Year: Multi-select dropdown with checkboxes
- Modified the existing field selection logic to exclude the 4 special fields from the main dropdown
- Automatically add the 4 special fields to the selected fields list by default
- Positioned the new special filter components above the existing dropdown
- Added protection to prevent users from deselecting special fields
- Updated UI to clearly separate special filters from regular field selection
- Implemented cascading filter logic: when Source is selected, Category options are filtered to only show values that exist in records where Source matches; when Category is selected (with Source), Sub Category options are filtered accordingly; when Sub Category is selected (with Source and Category), Year options are filtered; and finally, regular field options are filtered based on all special filter selections

### ✅ Step 3: Update useFields Hook
- Modified the `useFields` hook to exclude the 4 special fields from the returned field list
- Ensured the hook still returns all other fields as before
- Updated dependency arrays to properly use specialFilters parameter

### ✅ Step 4: Update Fields API Route
- Modified the `/api/fields` route to extract actual field names from filtered records when special filters are applied
- Instead of only querying the imports collection, the endpoint now queries the excel-records collection directly when special filters are applied
- Added logic to query sample records and extract all unique property names from matching records
- Implemented proper handling of field data types, especially for Year fields (distinguishing between numbers and strings)
- Added exclusion of Cosmos DB metadata fields (id, fileName, _rid, _self, _etag, _attachments, _ts, documentType, _partitionKey, _importId, and any field starting with underscore)
- Enhanced error handling to prevent fallback to dummy test1/test2 data
- Implemented robust field extraction using Cosmos DB query iterator to scan all matching records up to a reasonable limit, rather than just sampling the first 100 records
- Added comprehensive logging to track record counts and identify specific fields in results

### ✅ Step 5: Handle Query Building
- Updated the query building logic to include the special field filters in the API request
- Ensured the 4 special fields are always included in the SELECT clause
- Applied filtering logic based on user selections for these fields

### ✅ Step 6: Update Results Display
- Ensured the special fields (Source, Category, Sub Category, Year) are always present in query results
- Updated the data grid or table component to properly display these fields

## Implementation Details

### Special Field Components
- **Source, Category, Sub Category**: 
  - Single dropdown with grouped options
  - Values fetched from Cosmos DB distinct values endpoint
  - Allow user to filter by selecting one value from each category
  - Implement cascading behavior: each subsequent field is filtered based on prior selections
- **Year**: 
  - Multi-select dropdown with checkboxes
  - Allow user to filter by selecting multiple years
  - Values fetched from Cosmos DB distinct values endpoint
  - Properly handles numeric values in queries

### Cascading Filter Logic
- Source → Category → Sub Category → Year hierarchy is implemented
- When a special filter is selected, subsequent filters show only values that exist in records matching previous selections
- When any special filter in the chain changes, dependent filters are reset to maintain consistency
- Regular field options are dynamically updated based on all applied special filters

### Automatic Field Selection
- The 4 special fields (Source, Category, Sub Category, Year) are automatically added to the selected fields
- These fields do not appear in the main dropdown but will always be part of the query results
- User can still apply filters to these fields using the special controls
- Protection added to prevent users from accidentally deselecting these special fields

### API Integration
- Existing endpoint: `GET /api/distinct-values?fields=Source,Category,Sub Category,Year`
- Fields endpoint: `GET /api/fields` now supports special filter parameters
- Response format: 
  ```json
  {
    "success": true,
    "values": {
      "Source": ["ESDM", "PLN"],
      "Category": ["Energy", "Electricity"],
      "Sub Category": ["Energy Price per Energy Unit", "Power Balance"],
      "Year": [2022, 2023, 2024]
    }
  }
  ```

### Dynamic Field Extraction
- When special filters are applied, the system queries the excel-records collection directly
- Robust extraction process iterates through all matching records (up to 1000) using Cosmos DB query iterator to ensure comprehensive field discovery
- Extracts all unique property names from all matching records (excluding system/metadata fields)
- Returns actual field names that exist in the filtered data (like "Energy", "Unit Price", "Value", etc.)
- Properly handles data type conversion, especially for Year fields
- Includes comprehensive logging to track record counts and identify specific fields during processing

### Metadata Field Exclusion
- Excludes standard Cosmos DB system fields: id, fileName, _rid, _self, _etag, _attachments, _ts, documentType, _partitionKey
- Excludes import-specific metadata field: _importId
- Excludes any field starting with underscore (which are considered metadata)
- Only returns meaningful data fields to the user

### UI/UX Considerations
- Special filter controls are placed above the main field selection dropdown
- Clear visual separation between special filters and regular field selection
- Special fields are automatically included in results
- Maintained existing styling and design patterns
- Ensured responsive design compatibility
- Added loading messages to indicate when options are updating based on selections
- Improved text to inform users that field options update based on filter selections

## Testing Plan - COMPLETED
- ✅ Tested that the 4 special fields are no longer shown in the main dropdown
- ✅ Verified that the 4 special fields are always present in query results
- ✅ Verified that the special filter components load distinct values from Cosmos DB
- ✅ Tested that selected values from special filters properly filter the results
- ✅ Validated that regular field selection continues to work as before
- ✅ Tested error handling when Cosmos DB is unavailable
- ✅ Verified that special fields cannot be deselected by the user
- ✅ Tested cascading filter behavior (Source → Category → Sub Category → Year)
- ✅ Verified that regular field options update based on special filter selections
- ✅ Confirmed proper handling of Year field data types (numbers vs strings)
- ✅ Tested that metadata fields are excluded from results
- ✅ Verified enhanced error handling doesn't return dummy test data
- ✅ Validated robust field extraction finds fields in records beyond the initial sample (e.g., fields at positions >100)
- ✅ Confirmed comprehensive logging provides visibility into field extraction process

## Status: IMPLEMENTATION COMPLETE
All requirements have been successfully implemented and tested. The FieldSelector component now properly handles the 4 special fields (Source, Category, Sub Category, Year) with dedicated filter controls while automatically including them in query results. The implementation includes cascading filter logic, dynamic field extraction from filtered records using comprehensive scanning, proper data type handling, metadata field exclusion, and enhanced error handling. The robust field extraction ensures that fields like "Append" existing beyond the first 100 records are properly discovered and made available for selection.