# Utilities AGENTS.md

## Package Identity

Shared utility functions and helpers for the Excel-to-Cosmos DB application.
- **Purpose**: Provide reusable utility functions across the application
- **Structure**: Stateless helper functions organized by functionality

## Setup & Run

### Development
Utils are automatically loaded when referenced by other modules.

### Testing Commands
```bash
npm run test:client -- --testNamePattern="utils"  # Run utility function tests
```

## Patterns & Conventions

### Utility Organization
- Pure functions that don't depend on React lifecycle or components
- Organized by functionality (string manipulation, data processing, etc.)
- Side-effect free where possible

### Utility Standards
- ✅ DO: Write pure functions that are predictable and testable
- ✅ DO: Use TypeScript for all utility functions with proper typing
- ✅ DO: Export utility functions individually for tree-shaking
- ❌ DON'T: Include side effects in utility functions unless explicitly required

### Utility Naming & Export
- ✅ DO: Use descriptive names that clearly indicate the function's purpose
- ✅ DO: Export functions as named exports unless they are the main purpose of the file
- ✅ DO: Use consistent naming patterns across utilities
- ❌ DON'T: Create utilities with multiple unrelated functions in one file

### Performance Considerations
- ✅ DO: Optimize for performance since utilities are used frequently
- ✅ DO: Consider memoization for expensive computations
- ✅ DO: Use efficient algorithms for data processing utilities

## Touch Points / Key Files

- **Common Utilities**: Look in `src/utils/` directory for utility files
- **Data Processing**: `src/utils/data-processing.ts` or similar
- **String/Formatting**: `src/utils/formatting.ts` or similar
- **Type Helpers**: `src/utils/types.ts` or similar

## JIT Index Hints

```bash
# Find all utility functions
rg -n "export.*function\|const.*=\|export default" src/utils/

# Find utility usage in other files
rg -n "from.*utils\|from.*util" src/**/*.ts src/**/*.tsx

# Find TypeScript utilities
rg -n "typeof\|infer\|keyof\|Pick\|Omit" src/utils/

# Find utility tests
find src/utils -name "*.test.ts" -o -name "*.spec.ts"

# Find utility barrel exports
rg -n "^export" src/utils/index.ts
```

## Common Gotchas

- **Tree Shaking**: Keep utilities separate so unused functions can be eliminated in builds
- **Dependencies**: Keep utility functions lightweight without heavy dependencies
- **Side Effects**: Avoid side effects that make utilities harder to test and reason about

## Pre-PR Checks
```bash
npm run test:client -- --testNamePattern="utils" && npm run type-check
```