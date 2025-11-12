# UI Base Components AGENTS.md

## Package Identity

Base UI components implementing the design system for the Excel-to-Cosmos DB application.
- **Purpose**: Provide reusable, accessible, and consistent UI primitives
- **Framework**: React 18, TypeScript, Radix UI primitives, Tailwind CSS

## Setup & Run

### Development
UI components are automatically loaded by other components in the application.

### Testing Commands
```bash
npm run test:client      # Run all client tests including UI components
npm run test:client -- --testNamePattern="ui"  # Run UI component tests only
```

## Patterns & Conventions

### Component Standards
- `button.tsx` → Button component with variants
- `input.tsx` → Form input component
- `dialog.tsx` → Modal/dialog component using Radix
- `dropdown-menu.tsx` → Dropdown menu using Radix
- `table.tsx` → Data table components
- `card.tsx` → Card container component
- All components have corresponding .d.ts files for type definitions

### Component Architecture Patterns
- ✅ DO: Use Radix UI primitives for accessible foundation components
- ✅ DO: Follow shadcn/ui patterns for consistent component structure
- ✅ DO: Export components with clear descriptive names
- ❌ DON'T: Modify Radix UI default behaviors without good reason

### Class Name Composition
- ✅ DO: Use `cn()` utility for merging Tailwind classes
- ✅ DO: Follow consistent class ordering (positioning, layout, typography, visual)
- ✅ DO: Use conditional class application properly
- ❌ DON'T: Hard-code styling that should be themeable

### Accessibility Standards
- ✅ DO: Follow WAI-ARIA guidelines for accessibility
- ✅ DO: Use proper semantic HTML elements
- ✅ DO: Implement keyboard navigation support using Radix UI
- ❌ DON'T: Override accessibility features provided by Radix

### TypeScript Typing
- ✅ DO: Use proper TypeScript interfaces for all props
- ✅ DO: Extend Radix UI props appropriately
- ✅ DO: Maintain type compatibility with Radix UI
- ❌ DON'T: Use any type when proper interfaces are available

### Component Composition
- ✅ DO: Build components that compose well together
- ✅ DO: Use compound component patterns (e.g. Select.Root, Select.Trigger, Select.Content)
- ✅ DO: Accept children and slot props for flexibility
- ❌ DON'T: Create overly rigid components that can't be customized

## Touch Points / Key Files

- **Button Component**: `button.tsx` (with variants in `button-variants.ts`)
- **Form Components**: `input.tsx`, `label.tsx`, `select.tsx`, `checkbox.tsx`
- **Modal Components**: `dialog.tsx` 
- **Menu Components**: `dropdown-menu.tsx`
- **Data Display**: `table.tsx`, `card.tsx`
- **Toast System**: `toast.tsx`, `toaster.tsx`, `use-toast.ts`
- **Utility**: `use-toast.ts` (custom hook for toast notifications)

## JIT Index Hints

```bash
# Find all UI component implementations
rg -n "cn(\|className=\|tw-\|tailwind" src/components/ui/

# Find Radix UI usage
rg -n "@radix-ui\|Root\|Trigger\|Content\|Portal" src/components/ui/

# Find component compositions
rg -n "React.forwardRef\|React.ElementRef\|React.ComponentPropsWithoutRef" src/components/ui/

# Find TypeScript interfaces in UI components
rg -n "interface\|type.*Props" src/components/ui/

# Find exported UI components
rg -n "^export.*{" src/components/ui/

# Find UI component tests
find src/components/ui -name "*.test.tsx" -o -name "*.spec.tsx"

# Find variant definitions
rg -n "defineConfig\|variant\|defaultVariants" src/components/ui/
```

## Common Gotchas

- **Accessibility**: Always test with keyboard navigation and screen readers
- **Compositions**: Compound components should follow Radix patterns exactly
- **Class Names**: Use `cn()` function for merging Tailwind classes properly 
- **Typing**: Extend Radix types rather than redefining them
- **Theming**: Components should respect global theme settings

## Pre-PR Checks
```bash
npm run test:client -- --testNamePattern="ui" && npm run type-check
```