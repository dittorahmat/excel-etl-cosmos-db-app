# Dynamic Field Filtering Implementation Plan

## Overview
This document outlines the plan to implement dynamic field filtering in the FieldSelector component. The feature will allow fields to be filtered based on relationships with previously selected fields, where related fields come from ALL Excel files containing that field.

## Current Implementation
- Fields are loaded from `/api/fields` endpoint
- All fields are displayed in the FieldSelector dropdown
- No relationship filtering exists between fields

## Proposed Solution

### 1. Backend Changes (@server/src/routes/fields.route.ts)

#### Add New Endpoint Parameter
```
GET /api/fields?relatedTo=fieldName
```

#### Query Modification
Current query:
```sql
SELECT c.headers FROM c WHERE c._partitionKey = 'imports'
```

New query with filtering:
```sql
SELECT c.headers, c.fileName FROM c WHERE c._partitionKey = 'imports'
```

When `relatedTo` parameter is provided:
1. Find ALL fileNames containing the related field
2. Filter results to include headers from documents with any of those fileNames

#### Implementation Steps:
1. Modify the existing route to accept an optional `relatedTo` query parameter
2. When parameter is provided, first query to find ALL fileNames containing that field
3. Then filter the results to include fields from ALL those files
4. Return the aggregated field list in the same format

### 2. Frontend Changes (@src/components/QueryBuilder/FieldSelector.tsx)

#### State Management
- Track selected fields with their relationships
- Implement dynamic field fetching based on selections

#### Implementation Steps:
1. Create a new hook/service for fetching filtered fields
2. Modify FieldSelector to fetch fields dynamically:
   - Initial load: fetch all fields (current behavior)
   - When a field is selected: fetch related fields from ALL files containing that field
3. Update the field list in the dropdown based on current selections
4. Implement incremental filtering:
   - When multiple fields are selected, find common fileName
   - If no common fileName exists, show intersection of related fields
5. Add loading states for field fetching

### 3. Data Flow

#### Initial Load
1. FieldSelector mounts
2. Fetches all fields from `/api/fields`
3. Displays all fields in dropdown

#### First Selection
1. User selects a field (e.g., "Name")
2. FieldSelector requests related fields from `/api/fields?relatedTo=Name`
3. Backend finds ALL fileNames containing "Name" field
4. Backend returns fields from ALL those files
5. FieldSelector updates dropdown with aggregated filtered fields

#### Additional Selections
1. User selects another field (e.g., "Email")
2. FieldSelector requests related fields from `/api/fields?relatedTo=Email`
3. Backend verifies which files contain both "Name" and "Email"
4. Backend returns fields from all those files
5. FieldSelector maintains the aggregated filtered list

#### Edge Cases
1. If user selects fields from different files:
   - Show intersection of related fields
   - Or show fields from all files containing any selected field
   - (Decision needed based on UX requirements)

### 4. Technical Considerations

#### Performance
- Cache field relationships to minimize API calls
- Debounce field fetching when multiple quick selections are made
- Implement loading states for better UX

#### Error Handling
- Handle cases where related fields cannot be found
- Gracefully fallback to showing all fields if filtering fails
- Display appropriate error messages to user

#### UX Improvements
- Add visual indicators showing which fields are related
- Show the source file names for context
- Provide a way to reset filtering and see all fields

## Implementation Steps

### Phase 1: Backend
1. Modify fields route to support filtering
2. Implement multi-file field relationship logic
3. Test with sample data

### Phase 2: Frontend
1. Create field fetching service with caching
2. Modify FieldSelector to use dynamic field fetching
3. Implement incremental filtering logic
4. Add loading and error states

### Phase 3: Testing
1. Test with single file scenarios
2. Test with multiple file scenarios
3. Verify performance with large datasets
4. Validate error handling

## Expected Outcomes
- Fields dynamically filter based on relationships across ALL files
- Comprehensive view of related fields for better data exploration
- Improved user experience when working with related data from multiple files
- Better performance by reducing irrelevant field options
- More intuitive data exploration workflow