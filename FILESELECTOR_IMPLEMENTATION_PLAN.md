# FileSelector Implementation Plan (Updated)

## Overview
This updated plan reflects the complete implementation of a FileSelector component that replaced the current FieldSelector with a file-based query approach, using cascading filters with a modified flow: Source → Category → Sub Category → File Selection → Year. The new approach fetches all fields from the selected file and allows additional filtering by Year, with proper performance optimizations and authentication.

## Components Created/Modified

### 1. Backend Endpoints
- `GET /api/query/file` - Fetch data based on selected file and filters
- `GET /api/query/file-get` - Generate API link for file-based queries
- `GET /api/distinct-file-values` - Get distinct values for cascading filters based on files
- `GET /api/query/files-by-filters` - Returns files that contain data matching the specified filters (NEW - designed specifically for cascading file selection)

### 2. Frontend Components & Hooks
- `FileSelector.tsx` - Main component replacing FieldSelector with cascading filter functionality
- `useDebouncedApi.ts` - Custom hook with request debouncing, cancellation, and proper authentication for all API calls
- Updated `useDashboardData.ts` - File-based queries instead of field-based, optimized field loading

### 3. Modifications Required
- Updated `QueryBuilder.tsx` to use FileSelector instead of FieldSelector
- Updated `ApiGenerationContent.tsx` to support file-based API generation
- Updated `DashboardPage.tsx` to handle file-based queries
- Updated `useDashboardData.ts` hook for file-based logic with optimized field loading

## Implementation Steps (Completed)

### Phase 1: Backend Development
1. Created API endpoint `/api/query/file` to fetch data by file basis
   - Accepts parameters: file ID, Source, Category, Sub Category, Year
   - Returns all fields from the specified file with applied filters
   - Follows the same response structure as existing `/api/query/rows` endpoint

2. Created API endpoint `/api/query/file-get` for generating file-based API links
   - Accepts the same parameters as the POST endpoint
   - Provides GET access to the same data
   - Returns same response structure as POST endpoint

3. Created API endpoint `/api/distinct-file-values` for cascading filter values
   - Accepts parameters: fields to fetch, current filter selections (Source, Category, Sub Category)
   - Returns distinct values for each requested field based on current filter context
   - Implements cascading logic: values for Category depend on Source selection, etc.

4. Created specialized API endpoint `/api/query/files-by-filters` for cascading file selection
   - Queries Cosmos DB to find unique `_importId` values that match the Source/Category/Sub Category criteria
   - Returns only import records that contain data matching the specified filters
   - Preserves existing `/api/query/imports` endpoint functionality for FileListTable component

### Phase 2: Frontend Hooks
1. Implemented `useDebouncedApi.ts` hook with advanced functionality:
   - Request debouncing to prevent excessive API calls
   - Request cancellation to prevent stale requests
   - Proper authentication using the `api` utility throughout
   - Cascading distinct value updates that respect previous selections
   - Optimized file loading based on filter criteria
   - Loading and error state management for all operations

2. Updated `useDashboardData.ts` to support file-based queries with optimizations:
   - Reduced field loading to only special filter fields (Source, Category, Sub Category, Year)
   - Maintains compatibility with cascading filters
   - Preserves functionality for FilterControls component
   - Proper authentication for all operations

### Phase 3: Frontend Components
1. Created `FileSelector.tsx` component with comprehensive features:
   - File selection dropdown with search capability that appears after Sub Category selection
   - Cascading special filters following the sequence: Source → Category → Sub Category → File Selection → Year
   - Proper integration with `useDebouncedApi` hook for optimized API calls
   - Loading states for each cascading level with proper cancellation
   - Error handling for each API call with user feedback
   - Authentication for all API operations
   - Debounced requests to prevent rate limiting

2. Component structure:
   ```
   FileSelector
   ├── Special Filters Section
   │   ├── Source Dropdown (no dependency)
   │   ├── Category Dropdown (depends on Source, updates dynamically)
   │   ├── Sub Category Dropdown (depends on Source & Category, updates dynamically)
   │   ├── File Selection Dropdown (depends on all above, uses /api/query/files-by-filters endpoint)
   │   └── Year Multi-Select (depends on selected File)
   └── Selected File Display
   ```

### Phase 4: Integration & Performance Optimizations
1. Replaced FieldSelector with FileSelector in QueryBuilder
   - Updated QueryBuilder props to accept file-based parameters
   - Modified the `onExecute` callback to pass file-based parameters instead of field-based
   - Updated component state management with file-specific logic

2. Updated ApiGenerationContent for file-based parameters
   - Modified API URL generation to include file ID instead of field list
   - Updated the API URL structure to match the new endpoints
   - Maintained the same token handling logic with proper authentication

3. Updated DashboardPage for file-based query results
   - Verified data structure compatibility with new API endpoints
   - Updated field-specific logic to work with file-based results
   - Ensured export functionality works correctly with file-based data

4. Implemented comprehensive performance optimizations:
   - Request debouncing to prevent excessive API calls during rapid selections
   - Request cancellation to prevent stale requests from updating UI
   - Proper authentication headers for all API calls
   - Optimized field loading in useDashboardData hook to reduce unnecessary API calls
   - Efficient cascading updates that only fetch what's needed

### Phase 5: Testing and Validation
1. Validated cascading filter behavior:
   - Source → Category filtering works correctly with dynamic updates
   - Category → Sub Category filtering works correctly with dynamic updates
   - Sub Category → File Selection filtering works correctly via new API endpoint
   - File Selection → Year filtering works correctly

2. Validated file selection functionality:
   - Search functionality within file dropdown works properly
   - File selection updates dependent filters appropriately
   - All fields from selected file are included in results
   - Proper filtering based on Source/Category/Sub Category criteria

3. Tested API generation with file-based parameters:
   - Generated URLs work correctly with proper authentication
   - Token handling works as expected
   - API responses match expected structure

4. Validated data display in DashboardPage:
   - Query results display correctly with file-based data
   - Sorting functionality works with file-based data
   - Export functionality works with file-based data

## Technical Details

### FileSelector Component Flow (Updated)
1. User selects Source
2. Category options update dynamically based on selected Source (via /api/distinct-values with filter)
3. User selects Category
4. Sub Category options update dynamically based on selected Source & Category (via /api/distinct-values with filters)
5. User selects Sub Category
6. File Selection dropdown updates with files that contain data matching the Source/Category/Sub Category criteria (via new /api/query/files-by-filters endpoint)
7. User selects a file (with search capability)
8. Year options update based on selected file (via /api/query/distinct-file-values)
9. User selects Year(s) if desired
10. All selected parameters are passed to query execution via /api/query/file endpoint

### Backend API Endpoints (Complete)
- `GET /api/query/file`: Accepts file ID, Source, Category, Sub Category, Year parameters, returns all fields from specified file with applied filters
- `GET /api/query/file-get`: Same as above but for API link generation  
- `GET /api/distinct-file-values`: Returns distinct values for special filters based on file and current filter selections
- `GET /api/query/files-by-filters`: NEW endpoint that returns only files containing data matching specified filters
- `GET /api/distinct-values`: Updated to support dynamic cascading queries with filters

### State Management (Optimized)
The FileSelector maintains optimized state for:
- Special filter values (Source, Category, Sub Category, Year) with dynamic updates
- Selected file ID
- Available options for each cascading level with proper filtering
- Loading states for each API call with proper cancellation
- Error states for each operation with user feedback
- Request cancellation tokens for active operations
- Debounced API calls to prevent excessive requests

### Performance Optimizations
1. Request debouncing: Prevents multiple rapid API calls during cascading filter changes
2. Request cancellation: Cancels previous requests when new ones are initiated
3. Optimized field loading: Only loads special filter fields needed for UI, not all fields
4. Proper authentication: All API requests include proper authentication headers via the api utility
5. Efficient Cosmos DB queries: Targeted queries that minimize data transfer

## Final Architecture
- Preserved existing `/api/query/imports` endpoint for FileListTable (non-filtered file listing)
- Added new `/api/query/files-by-filters` endpoint for cascading file selection (filtered file listing)
- All components properly authenticated and optimized for performance
- Cascading filters work as designed: files are filtered by their content (Source/Category/Sub Category)
- FileSelector integrates seamlessly with existing DashboardPage and API generation

The implementation successfully provides the requested file-based query flow with proper cascading filters while maintaining performance and existing functionality.