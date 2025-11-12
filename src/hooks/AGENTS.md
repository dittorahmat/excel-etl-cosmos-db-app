# React Hooks AGENTS.md

## Package Identity

Custom React hooks for the Excel-to-Cosmos DB application.
- **Purpose**: Encapsulate reusable React logic that spans multiple components
- **Framework**: React 18 Hooks API, TypeScript

## Setup & Run

### Development
Hooks are automatically loaded by components that use them.

### Testing Commands
```bash
npm run test:client                    # Run all client tests including hook tests
npm run test:client -- --testNamePattern="hook"  # Run hook-specific tests only
```

## Patterns & Conventions

### Hook Organization
- `useApi.ts` → API call abstraction hooks
- `useAuth.ts` → Authentication state management
- `useCosmosQuery.ts` → Cosmos DB query abstraction
- `useExcelUpload.ts` → Excel file upload logic
- `usePagination.ts` → Pagination state management
- Additional hooks as per application needs

### Hook Architecture Patterns
- ✅ DO: Follow the "use" prefix naming convention for all custom hooks
- ✅ DO: Return consistent structures (objects with named properties or arrays)
- ✅ DO: Include proper TypeScript typing for hook parameters and returns
- ❌ DON'T: Call Hooks from within loops, conditions, or nested functions

### State Management Patterns
- ✅ DO: Use useState for local component state
- ✅ DO: Use useReducer for complex state logic with multiple sub-values
- ✅ DO: Implement proper initial state strategies
- ❌ DON'T: Overuse useReducer for simple state that could be managed with useState

### Effect Patterns
- ✅ DO: Include proper dependencies arrays for useEffect
- ✅ DO: Implement cleanup functions when subscribing to events or creating subscriptions
- ✅ DO: Use useCallback for functions passed to child components
- ❌ DON'T: Forget to include dependencies in useEffect arrays

### Performance Optimizations
- ✅ DO: Use useMemo for expensive calculations
- ✅ DO: Use useCallback to prevent unnecessary re-renders of child components
- ✅ DO: Memoize complex objects returned from hooks when necessary
- ❌ DON'T: Wrap everything in useMemo/useCallback without measuring performance gains

### API Integration Patterns
- ✅ DO: Abstract API calls behind hooks
- ✅ DO: Handle loading, error, and success states consistently
- ✅ DO: Implement proper caching and refetching strategies
- ❌ DON'T: Make API calls directly in components instead of using hooks

## Touch Points / Key Files

- **API Abstraction**: `useApi.ts` or similar API hook files
- **Authentication**: `useAuth.ts` or authentication state management
- **Data Queries**: `useCosmosQuery.ts` or similar data fetching hooks
- **Excel Operations**: `useExcelUpload.ts` or file processing hooks
- **State Management**: `useGlobalState.ts` or application state hooks
- **Form Management**: `useForm.ts` or form validation hooks

## JIT Index Hints

```bash
# Find all custom hooks
rg -n "export.*function.*use[A-Z]\|export const.*use[A-Z]" src/hooks/

# Find hook implementations
rg -n "^function.*use[A-Z][a-z].*\|^const.*use[A-Z][a-z]" src/hooks/

# Find hook exports
rg -n "^export.*use[A-Z]" src/hooks/

# Find hook usage in other files
rg -n "use[A-Z][a-zA-Z]+\(" src/**/*.ts src/**/*.tsx | grep -v hooks | head -10

# Find useEffect patterns in hooks
rg -n "useEffect\|useMemo\|useCallback\|useRef" src/hooks/

# Find TypeScript interfaces in hooks
rg -n "interface\|type.*=" src/hooks/

# Find hook tests
find src/hooks -name "*.test.ts" -o -name "*.spec.ts" | head -5

# Find state management in hooks
rg -n "useState\|useReducer\|useContext" src/hooks/
```

## Common Gotchas

- **Rules of Hooks**: Always use Hooks at the top level of React function components
- **Dependencies**: Always include all reactive dependencies in useEffect and other effect hook dependency arrays
- **Performance**: Measure before optimizing with useMemo/useCallback; premature optimizations can hurt readability
- **Cleanup**: Remember to cleanup subscriptions, intervals, or event listeners in useEffect cleanup functions

## Pre-PR Checks
```bash
npm run test:client -- --testNamePattern="hook" && npm run type-check
```