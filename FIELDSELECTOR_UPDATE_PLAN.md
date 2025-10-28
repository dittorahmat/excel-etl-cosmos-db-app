# FieldSelector Component Update Plan

## Overview
This plan outlines the changes needed to update the FieldSelector component to:
1. Exclude 4 specific fields (Source, Category, Sub Category, Year) from the main dropdown
2. Create separate filter controls for these 4 fields above the main dropdown
3. Implement special dropdowns for the 4 fields with distinct values from Cosmos DB

## Implementation Steps

### Step 1: Create API Endpoint for Distinct Values
- Create a new API endpoint `/api/distinct-values` to fetch distinct values for specified fields
- The endpoint should accept a `fields` query parameter with comma-separated field names
- The endpoint should return distinct values for each requested field
- Handle special case for Year field (ensure numeric values)

### Step 2: Update FieldSelector Component
- Add new state variables to manage the values for the 4 special fields
- Add logic to fetch distinct values for the 4 special fields on component mount
- Create separate dropdown components for:
  - Source, Category & Sub Category: Single dropdown choice with grouped options
  - Year: Dropdown with checkbox multiple choice
- Modify the existing field selection logic to exclude the 4 special fields
- Position the new special filter components above the existing dropdown

### Step 3: Update useFields Hook
- Modify the `useFields` hook to exclude the 4 special fields from the returned field list
- Ensure the hook still returns all other fields as before

### Step 4: Handle Query Building
- Update the query building logic to include the special field filters in the API request
- Ensure proper filtering logic when executing queries

## Implementation Details

### Special Field Components
- **Source, Category, Sub Category**: 
  - Single dropdown with grouped options
  - Values fetched from Cosmos DB distinct values endpoint
  - Allow user to select one value from each category
- **Year**: 
  - Multi-select dropdown with checkboxes
  - Allow user to select multiple years
  - Values fetched from Cosmos DB distinct values endpoint

### API Integration
- New endpoint: `GET /api/distinct-values?fields=Source,Category,Sub Category,Year`
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

### UI/UX Considerations
- Place special filter controls above the main field selection dropdown
- Clear visual separation between special filters and regular field selection
- Maintain existing styling and design patterns
- Ensure responsive design compatibility

## Testing Plan
- Test that the 4 special fields are no longer shown in the main dropdown
- Verify that the special filter components load distinct values from Cosmos DB
- Test that selected values from special filters are properly applied to queries
- Validate that regular field selection continues to work as before
- Test error handling when Cosmos DB is unavailable