# Frontend Application AGENTS.md

## Package Identity

React frontend application for the Excel-to-Cosmos DB application.
- **Purpose**: User interface for Excel file upload, data querying, visualization and dashboard functionality
- **Framework**: React 18, TypeScript, Vite, Tailwind CSS

## Setup & Run

### Installation
```bash
npm install
```

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
```

### Testing Commands
```bash
npm run test:client      # Run client tests
npm run test:client:watch    # Watch mode for client tests
npm run test:client:coverage # Coverage report for client
npm run lint            # Run ESLint
npm run type-check      # Run TypeScript type checking
```

## Patterns & Conventions

### Directory Structure
- `components/` → Reusable UI components
- `pages/` → Route-level components
- `hooks/` → Custom React hooks
- `utils/` → Utility functions
- `types/` → TypeScript type definitions
- `lib/` → Library abstractions
- `assets/` → Static assets
- `routes/` → Frontend routing configuration
- `contexts/` → React Context providers

### Component Architecture
- ✅ DO: Use functional components with TypeScript interfaces
- ✅ DO: Follow React best practices (hooks, memoization, etc.)
- ✅ DO: Use proper TypeScript typing for all props and state
- ❌ DON'T: Use class components unless absolutely necessary

### State Management
- ✅ DO: Use React hooks (useState, useEffect, etc.) for component state
- ✅ DO: Use custom hooks for complex state logic
- ✅ DO: Consider React Query/TanStack Query for server state
- ❌ DON'T: Store server state in global React state unnecessarily

### Styling Approach
- ✅ DO: Use Tailwind CSS with the established design system
- ✅ DO: Leverage shadcn/ui components for consistency
- ✅ DO: Use the `cn()` utility function for class name merging
- ❌ DON'T: Create redundant CSS files

### API Integration
- ✅ DO: Use consistent API calling patterns across the application
- ✅ DO: Handle loading, error, and success states properly
- ✅ DO: Implement proper error boundaries
- ❌ DON'T: Make API calls directly in render functions

### Performance Optimization
- ✅ DO: Memoize expensive computations with useMemo
- ✅ DO: Use React.memo for components that render frequently
- ✅ DO: Implement lazy loading with React.lazy and Suspense
- ❌ DON'T: Cause unnecessary re-renders

## Touch Points / Key Files

- **Main App Component**: `App.tsx`
- **Entry Point**: `main.tsx`
- **Global Styles**: `index.css` or `App.css`
- **Configuration**: `vite.config.ts`
- **Routing**: `routes/index.tsx` or similar
- **Theme Provider**: Components managing application theme
- **Type Definitions**: `types/index.ts`

## JIT Index Hints

```bash
# Find React components
rg -n "export.*function.*[A-Z]\|const.*[A-Z].*=.*=>" src/

# Find custom hooks
rg -n "export.*function.*use[A-Z]\|export const.*use[A-Z]" src/

# Find API calls
rg -n "fetch\|axios\|http\|api\|useQuery\|useMutation" src/

# Find TypeScript interfaces
rg -n "interface\|type.*=" src/

# Find component usage
rg -n "<[A-Z][a-zA-Z]" src/

# Find Tailwind usage
rg -n "className=\|class=" src/

# Find state management
rg -n "useState\|useEffect\|useReducer\|useContext" src/

# Find React Query usage
rg -n "useQuery\|useMutation\|createQuery" src/

# Find tests in this package
find src -name "*.test.tsx" -o -name "*.spec.tsx"

# Find form handling
rg -n "form\|input\|onChange\|onSubmit\|onBlur" src/
```

## Common Gotchas

- **Performance**: Use React.memo for components that render frequently
- **Hooks**: Follow the Rules of Hooks to avoid common mistakes
- **TypeScript**: Use strict typing to catch errors early
- **Accessibility**: Implement proper ARIA attributes and keyboard navigation
- **Bundle Size**: Use code splitting to reduce initial load size

## Pre-PR Checks
```bash
npm run type-check && npm run test:client && npm run lint && npm run build
```