# File-Based Query System Implementation

## Overview

This document describes the implementation of the file-based query system that replaces the previous field-based approach. The new system implements cascading filters (Source → Category → Sub Category → File Selection → Year) and addresses rate limiting/authentication issues.

## Architecture Components

### Frontend Components

1. **DashboardPage.tsx** - Main dashboard component that orchestrates the query flow
2. **QueryBuilder.tsx** - Container component that manages the query interface
3. **FileSelector.tsx** - Component implementing the cascading filter UI
4. **useDashboardData.ts** - Custom hook managing state and API calls
5. **useDebouncedApi.ts** - Hook handling debounced API calls to prevent rate limiting
6. **ApiGenerationModal.tsx** - Modal for generating API endpoints

### Backend Components

1. **server/src/routes/query/file.route.ts** - File-based query API endpoints
2. **server/src/routes/query/index.ts** - Main query router
3. **server/src/hooks/useDashboardData.ts** - Server-side data handling

## Cascading Filter Flow

The cascading filter system works in the following order:
1. **Source** → When selected, populates available Categories
2. **Category** → When selected, populates available Sub Categories  
3. **Sub Category** → When selected, enables File selection
4. **File Selection** → When selected, enables Year filter
5. **Year** → Multi-select filter for specific years

### Implementation Details

- Each filter level triggers an API call to fetch dependent values
- When a higher-level filter changes, dependent filters are reset
- API calls are debounced to prevent rate limiting (300ms default)
- Requests are cancelled when new requests are made for the same endpoint

## API Endpoints

### File-Based Query Endpoints

- `GET /api/query/file` - Returns data based on file and filters
- `GET /api/query/file-get` - GET endpoint for API links with token in URL
- `GET /api/query/distinct-file-values` - Gets distinct values for cascading filters
- `GET /api/query/files-by-filters` - Gets files matching filter criteria

### Parameters

- `fileId` - Required for file-based queries
- `Source`, `Category`, `Sub Category` - Cascading filter parameters
- `Year` - Comma-separated years for multi-select (numeric values)
- `limit`, `offset` - Pagination parameters

## Data Response Enhancement

### Metadata Filtering

All Cosmos DB metadata and internal fields are filtered out from query results:
- **Removed Internal Fields**: `_importId`, `_partitionKey`
- **Removed System Fields**: `id`, `_self`, `_etag`, `_attachments`, `_ts`
- **Removed Application Metadata**: `documentType`
- **Only Business Data Returned**: Pure user data fields without technical metadata

This ensures clean, business-focused responses that are easy to consume and understand.

## Rate Limiting Prevention

The system implements several mechanisms to prevent rate limiting:

1. **Request Debouncing** - API calls are debounced (300ms) to limit rapid requests
2. **Request Cancellation** - Previous requests are cancelled when new ones are made
3. **Smart Filtering** - Cascading filters only load when necessary
4. **Retry Logic** - Failed requests due to rate limiting are retried with exponential backoff

## Authentication Handling

- Authentication is handled transparently through the `api.ts` utility
- Tokens are cached for 5 minutes to reduce MSAL calls
- Fallback to development tokens when authentication is disabled
- GET endpoints accept tokens as query parameters for API link sharing

## Export Functionality

Export functionality works with file-based results:
- CSV export with proper formatting and escaping
- Excel export using XLSX library
- Date formatting applied to timestamp fields

## API Generation

The API generation modal creates endpoints with:
- File ID as query parameter
- All selected filters as query parameters
- Authentication token as query parameter
- Proper URL encoding for all parameters

## Key Changes Made

1. **Migration** from field-based to file-based queries
2. **Implementation** of cascading filter dependencies
3. **Addition** of request debouncing and cancellation
4. **Fix** for Cosmos DB queries (using `_partitionKey` instead of `_importId`)
5. **Implementation** of proper authentication headers
6. **Update** of rate limiting configuration for development
7. **Correction** of field references for Year dropdown population
8. **Fix** for numeric field comparisons (Year as number vs string)
9. **Enhancement** of data responses with complete metadata filtering

## Error Handling

- Network errors are retried with exponential backoff
- Rate limit errors (429) trigger retry with appropriate delays
- Authentication errors trigger token refresh flows
- Invalid responses are handled gracefully with user feedback

## Testing Notes

The system has been tested with:
- Cascading filter flows from Source to Year
- File selection and query execution
- API generation with various filter combinations
- Export functionality with file-based results
- Rate limiting prevention during rapid filter changes
- Authentication token handling for both development and production
- Data response quality with complete metadata removal