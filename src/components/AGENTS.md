# UI Components AGENTS.md

## Package Identity

React UI components for the Excel-to-Cosmos DB application.
- **Purpose**: Reusable UI elements following design system principles
- **Framework**: React 18, TypeScript, Tailwind CSS, Radix UI, shadcn/ui

## Setup & Run

### Development
Components are automatically loaded by pages and other components.

### Testing Commands
```bash
npm run test:client      # Run all client tests
npm run test:client -- --testNamePattern="component"  # Run component tests only
```

## Patterns & Conventions

### Component Organization
- `ui/` → Reusable base UI components (buttons, inputs, etc.)
- `forms/` → Form-specific components
- `layout/` → Layout components (header, sidebar, etc.)
- `data-display/` → Data visualization and display components
- `modals/` → Modal and dialog components

### Component Architecture Patterns
- ✅ DO: Use TypeScript interfaces for all props
- ✅ DO: Follow shadcn/ui patterns for consistent component structure
- ✅ DO: Export components with clear descriptive names
- ❌ DON'T: Hard code values that should be configurable via props

### Styling Conventions
- ✅ DO: Use Tailwind CSS utility classes consistently
- ✅ DO: Follow the established design system tokens
- ✅ DO: Use conditional classes with `cn()` utility function
- ❌ DON'T: Use excessive custom CSS files

### Accessibility Standards
- ✅ DO: Follow WAI-ARIA guidelines for accessibility
- ✅ DO: Use semantic HTML elements where appropriate
- ✅ DO: Implement keyboard navigation support
- ❌ DON'T: Ignore screen reader accessibility

### Component Composition
- ✅ DO: Build components that compose well together
- ✅ DO: Use compound component patterns where appropriate (Dialog.Root, Dialog.Trigger, etc.)
- ✅ DO: Accept children and slot props for flexibility
- ❌ DON'T: Create overly rigid components that can't be customized

### Performance Considerations
- ✅ DO: Memoize expensive computations with useMemo/useCallback
- ✅ DO: Use React.lazy for heavy components that aren't always needed
- ✅ DO: Implement virtual scrolling for large lists

## Touch Points / Key Files

- **Base UI Components**: `ui/` directory
- **Form Components**: `forms/` directory
- **Layout Components**: `layout/` directory
- **Utility Functions**: `utils/classnames.ts` or `lib/utils.ts`
- **Component Tests**: Look for colocated `*.test.tsx` files

## JIT Index Hints

```bash
# Find all React components
rg -n "export.*function.*Component\|export const.*Component\|export {.*} from" src/components/

# Find UI component implementations
rg -n "className=\|tw-\|tailwind\|cn(" src/components/

# Find component composition patterns
rg -n "React.forwardRef\|React.memo\|useImperativeHandle" src/components/

# Find shadcn/ui usage
rg -n "@radix-ui\|shadcn\|ui library" src/components/

# Find component tests
find src/components -name "*.test.tsx" -o -name "*.spec.tsx"

# Find component exports
rg -n "export.*{" src/components/

# Find reusable utility functions
rg -n "export.*function.*use\|export.*hook" src/components/
```

## Common Gotchas

- **Class Names**: Use `cn()` function for merging Tailwind classes properly
- **Forwarding Refs**: Use `React.forwardRef` when components need to expose DOM refs
- **Compound Components**: Follow Radix UI patterns for complex components with multiple parts
- **Conditional Classes**: Use template literals with proper spacing when conditionally applying classes

## Pre-PR Checks
```bash
npm run test:client -- --testNamePattern="component" && npm run type-check
```