# Plan: Merge QueryBuilder and ApiQueryBuilderPage Components

## Overview
We need to merge the functionality of `@src/components/QueryBuilder/QueryBuilder.tsx` with `@src/pages/ApiQueryBuilderPage.tsx` to create a unified component that includes:
1. The core query building capabilities (FieldSelector, FilterControls)
2. The "Build Your API Query" header section from the page component

Both components already share the same underlying components:
- `@src/components/QueryBuilder/FieldSelector.tsx`
- `@src/components/QueryBuilder/FilterControls.tsx`

## Current State Analysis

### QueryBuilder.tsx
- Core query building component
- Contains FieldSelector and FilterControls
- Handles field selection, filter management, and query execution
- Has loading/error states
- Provides execute button functionality

### ApiQueryBuilderPage.tsx
- Page-level component that wraps query functionality
- Provides "Build Your API Query" header using Card components
- Uses ApiQueryBuilder (which is likely the same as QueryBuilder but with different styling/positioning)

## Proposed Solution

### 1. Component Restructuring
We'll enhance the existing `QueryBuilder` component to include the page-level UI elements:
- Add Card wrapper with header ("Build Your API Query")
- Maintain all existing functionality of the QueryBuilder
- Ensure consistent styling with the rest of the application

### 2. Implementation Steps

#### Step 1: Update QueryBuilder Component
- Add Card, CardHeader, CardTitle, and CardContent wrappers
- Include "Build Your API Query" title in CardHeader
- Wrap existing content in CardContent
- Maintain all props and functionality

#### Step 2: Update Import in ApiQueryBuilderPage
- Replace ApiQueryBuilder with QueryBuilder
- Pass through required props
- Remove duplicate Card components since QueryBuilder will now include them

#### Step 3: Verify Component Integration
- Ensure FieldSelector and FilterControls are properly integrated
- Confirm all event handlers and state management still work
- Test responsive design and styling consistency

### 3. Key Considerations

#### Props Management
- All existing QueryBuilder props will be maintained
- No breaking changes to the component API
- Default props will be preserved

#### Styling
- Use existing Card components for consistent UI
- Maintain spacing and layout from both components
- Ensure mobile responsiveness

#### Reusability
- Component will be usable both as a page and as a widget
- No hardcoded URLs or page-specific logic
- Maintain flexibility through props

### 4. File Modifications

#### src/components/QueryBuilder/QueryBuilder.tsx
```tsx
// Add imports
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

// Modify render to wrap in Card components
return (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <CardTitle>Build Your API Query</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Existing content */}
    </CardContent>
  </Card>
);
```

#### src/pages/ApiQueryBuilderPage.tsx
```tsx
// Simplify to directly use QueryBuilder
import { QueryBuilder } from '../components/QueryBuilder/QueryBuilder';

const ApiQueryBuilderPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Query Builder Standalone</h1>
      <QueryBuilder 
        // Pass required props
        fields={fields}
        selectedFields={selectedFields}
        onFieldsChange={handleFieldsChange}
        onExecute={handleExecute}
        // ... other props
      />
    </div>
  );
};
```

### 5. Benefits

1. **Code Reusability**: Single component for both page and widget usage
2. **Consistent UI**: Unified styling and user experience
3. **Maintainability**: One component to maintain instead of two similar ones
4. **Reduced Duplication**: Eliminates redundant functionality between components

### 6. Testing Plan

1. Verify FieldSelector functionality (search, select, deselect)
2. Test FilterControls (add/remove filters, operator selection)
3. Confirm query execution flow
4. Check loading and error states
5. Validate responsive design on different screen sizes
6. Ensure all event handlers work correctly

### 7. Rollback Plan

If issues arise, we can:
1. Revert changes to QueryBuilder.tsx
2. Restore ApiQueryBuilderPage.tsx to original state
3. Maintain current functionality with separate components

## Timeline
Estimated implementation time: 1-2 hours
Testing time: 30 minutes