# Application Pages AGENTS.md

## Package Identity

Top-level route components for the Excel-to-Cosmos DB application.
- **Purpose**: Route-level React components that compose together to form application views
- **Framework**: React 18, React Router, TypeScript

## Setup & Run

### Development
Pages are automatically loaded by the routing system in the application.

### Testing Commands
```bash
npm run test:client                    # Run all client tests including page tests
npm run test:client -- --testNamePattern="page"  # Run page-specific tests only
```

## Patterns & Conventions

### Page Organization
- `DashboardPage.tsx` → Main dashboard view
- `UploadPage.tsx` → Excel file upload functionality
- `QueryPage.tsx` → Data query and filtering functionality
- `ApiKeyManagementPage.tsx` → API key management
- Additional pages as per application needs

### Page Architecture Patterns
- ✅ DO: Use functional components with TypeScript interfaces for props
- ✅ DO: Follow route-based component architecture patterns
- ✅ DO: Include proper error boundary handling
- ❌ DON'T: Include business logic directly in page components

### Data Fetching Patterns
- ✅ DO: Use React Query/TanStack Query for server data
- ✅ DO: Handle loading states properly with skeletons or spinners
- ✅ DO: Implement proper error handling and retry mechanisms
- ❌ DON'T: Fetch data directly in useEffect without proper cache keys

### Layout Composition
- ✅ DO: Use layout components for common structure
- ✅ DO: Follow consistent header, sidebar, and footer patterns
- ✅ DO: Implement responsive design with Tailwind
- ❌ DON'T: Duplicate layout structures across multiple pages

### Performance Considerations
- ✅ DO: Use React.lazy for route-level components to enable code splitting
- ✅ DO: Memoize expensive computations in pages
- ✅ DO: Implement proper cleanup in useEffect hooks
- ❌ DON'T: Load all data upfront when pagination is appropriate

### Accessibility Standards
- ✅ DO: Include proper heading hierarchy (h1, h2, etc.)
- ✅ DO: Use semantic HTML elements appropriately
- ✅ DO: Implement keyboard navigation support
- ❌ DON'T: Ignore screen reader accessibility

## Touch Points / Key Files

- **Main Dashboard**: `DashboardPage.tsx`
- **Excel Upload**: `UploadPage.tsx` or similar upload functionality page
- **Data Query**: `QueryPage.tsx` or similar query interface
- **Auth Management**: `ApiKeyManagementPage.tsx` or similar auth pages
- **Routing Configuration**: Check router configuration for page routes

## JIT Index Hints

```bash
# Find all page components
rg -n "export default function.*Page\|export {.*} from" src/pages/

# Find page routing patterns
rg -n "Route\|Routes\|react-router\|useParams\|useNavigate" src/pages/

# Find data fetching in pages
rg -n "useQuery\|useMutation\|fetch\|axios\|api\." src/pages/

# Find page layouts
rg -n "Layout\|layout\|header\|sidebar\|footer" src/pages/

# Find page tests
find src/pages -name "*.test.tsx" -o -name "*.spec.tsx"

# Find page-level state management
rg -n "useState\|useEffect\|useReducer\|useContext" src/pages/

# Find error boundaries in pages
rg -n "ErrorBoundary\|error\|catch" src/pages/

# Find page-level TypeScript interfaces
rg -n "interface\|type.*Props" src/pages/
```

## Common Gotchas

- **Data Fetching**: Always implement proper loading and error states for server data
- **Memory Leaks**: Ensure proper cleanup of subscriptions, timers, and event listeners in useEffect
- **Route Parameters**: Handle route parameters properly with validation
- **Code Splitting**: Use React.lazy to split pages for better initial load times

## Pre-PR Checks
```bash
npm run test:client -- --testNamePattern="page" && npm run type-check
```