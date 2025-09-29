# Search Implementation Plan for FileListTable Component

## Overview
This document outlines the plan to add search functionality to the FileListTable component. The search bar will allow users to filter the displayed files by name, making it easier to find specific files among potentially many uploads.

## Current Component Structure
The FileListTable component currently:
- Fetches files from `/api/v2/query/imports` endpoint
- Implements pagination with page size of 10
- Displays files in a table with columns: File, Status, Size, Uploaded, Actions
- Includes delete functionality with confirmation
- Has loading and error states

## Proposed Implementation

### 1. Add Search State
We'll add new state variables to manage the search functionality:
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [filteredFiles, setFilteredFiles] = useState<FileData[]>([]);
```

### 2. Modify Data Flow
The current data flow is:
```
API Response → files state → Table Rendering
```

With search, it will become:
```
API Response → files state → Filter by searchTerm → filteredFiles state → Table Rendering
```

### 3. Search Bar Placement
Add a search bar at the top of the component, above the table:
- Positioned between the error messages and the table
- Full width input field with a search icon
- Clear button (×) to reset the search
- Debounced input to prevent excessive filtering

### 4. Search Logic
Filter files based on:
- Case-insensitive match in the file name
- Partial matches (contains) rather than exact matches
- Applied to the `name` property of `FileData`

### 5. UX Considerations
- Real-time filtering as the user types (with debounce)
- Clear indication when search results are empty
- Preserve pagination controls but adjust based on filtered results
- Keyboard accessibility (Enter to submit, Escape to clear)

### 6. Implementation Steps

#### Step 1: Add State Variables
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
```

#### Step 2: Add Debounce Effect
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 300); // 300ms debounce
  
  return () => clearTimeout(timer);
}, [searchTerm]);
```

#### Step 3: Filter Files Effect
```typescript
useEffect(() => {
  if (!debouncedSearchTerm) {
    setFilteredFiles(files);
  } else {
    const filtered = files.filter(file => 
      file.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
    setFilteredFiles(filtered);
  }
}, [debouncedSearchTerm, files]);
```

#### Step 4: Update Rendering Logic
Replace references to `files` with `filteredFiles` in the table rendering:
- Map over `filteredFiles` instead of `files`
- Update "No files" message logic
- Adjust pagination calculations based on filtered results

#### Step 5: Add Search UI
Create a search bar component with:
- Input field with search icon
- Clear button
- Proper styling consistent with existing design
- Placeholder text ("Search files...")
- ARIA labels for accessibility

#### Step 6: Adjust Pagination
Modify pagination to work with filtered results:
- When search is active, reset to page 1
- Recalculate total pages based on filtered results
- Potentially hide pagination when filtered results fit on one page

### 7. Edge Cases to Handle
1. Empty search term - show all files
2. No matching results - show "No files match your search" message
3. Search while loading - maintain loading state
4. Clear search - reset to showing all files
5. Search term with special characters - properly escape for filtering

### 8. Performance Considerations
1. Debouncing input to prevent excessive re-renders
2. Efficient filtering algorithm using native array methods
3. Memoization of filtered results if needed
4. Maintaining virtualization if list becomes very large

### 9. Accessibility
1. Proper ARIA labels for search input
2. Keyboard navigation support
3. Screen reader announcements for search results
4. Focus management when clearing search

### 10. Styling
1. Consistent with existing component design language
2. Responsive layout for mobile devices
3. Visual feedback for focused/hover states
4. Clear button only appears when there's text to clear

## Alternative Approaches Considered

### Backend Search
Instead of filtering on the client side, we could:
- Add a search parameter to the API request
- Let the backend handle the filtering

Pros:
- More efficient for large datasets
- Consistent with pagination

Cons:
- Requires backend changes
- Network latency for each keystroke
- More complex implementation

### Fuse.js or Similar Libraries
Use a dedicated fuzzy search library for more advanced matching.

Pros:
- Better search matching algorithms
- Fuzzy search capabilities

Cons:
- Additional dependency
- Overkill for simple filename matching
- Larger bundle size

## Recommended Approach
The client-side filtering approach is recommended because:
1. It's simpler to implement
2. Provides instant feedback
3. Doesn't require backend changes
4. Works well with the existing pagination system
5. Sufficient for typical file list sizes

## Implementation Sequence
1. Add search state and debouncing
2. Implement filtering logic
3. Add search UI component
4. Update table rendering to use filtered files
5. Adjust pagination controls
6. Add accessibility attributes
7. Test edge cases
8. Verify responsive design

## Testing Considerations
1. Unit tests for filtering function
2. Integration tests for search UI
3. Accessibility testing with screen readers
4. Performance testing with large file lists
5. Cross-browser compatibility testing