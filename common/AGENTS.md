# Common Utilities AGENTS.md

## Package Identity

Shared codebase components used across both client and server for the Excel-to-Cosmos DB application.
- **Purpose**: Provide common types, utilities, and functions used by both frontend and backend
- **Structure**: Language-agnostic utilities with TypeScript definitions

## Setup & Run

### Development
Common modules are automatically loaded by both client and server applications.

### Testing Commands
```bash
npm run test -- --testNamePattern="common"  # Run common module tests
npm run type-check                         # Type check all common modules
```

## Patterns & Conventions

### Code Organization
- `types/` → TypeScript type definitions shared between client and server
- `utils/` → Shared utility functions
- `constants/` → Shared constants and configuration values
- `interfaces/` → Common interfaces

### Common Module Standards
- ✅ DO: Write isomorphic code that works in both Node.js and browser environments
- ✅ DO: Use TypeScript for all common code with proper typing
- ✅ DO: Keep dependencies minimal to avoid bloating both client and server
- ❌ DON'T: Include platform-specific functionality

### Cross-Platform Compatibility
- ✅ DO: Avoid using Node.js-specific globals (process, fs, path) without checking environment
- ✅ DO: Avoid DOM-specific APIs in common code
- ✅ DO: Use environment detection when platform-specific code is required
- ❌ DON'T: Reference Node.js-only or browser-only APIs directly

### Type Safety
- ✅ DO: Provide comprehensive TypeScript definitions for all exports
- ✅ DO: Use discriminated unions where appropriate for type safety
- ✅ DO: Maintain backward compatibility when possible
- ❌ DON'T: Use `any` type when proper interfaces are available

### Versioning & Dependencies
- ✅ DO: Pin major versions of dependencies to ensure compatibility
- ✅ DO: Document any breaking changes when updating common modules
- ✅ DO: Keep dependencies consistent between client and server

## Touch Points / Key Files

- **Common Types**: `types/index.ts` or similar barrel exports
- **Validation Schemas**: Common validation patterns used by both sides
- **API Contracts**: Type definitions for client-server communication
- **Constants**: `constants/index.ts` for shared configuration
- **Cross-Platform Utilities**: Utility functions that work in both environments

## JIT Index Hints

```bash
# Find all common types
rg -n "export.*interface\|export.*type\|export.*enum" common/

# Find shared constants
rg -n "const\|export.*=" common/

# Find utility functions in common
rg -n "export.*function\|export default.*function" common/

# Find imports from common in client
rg -n "@/common\|@common\|common/" src/

# Find imports from common in server
rg -n "@/common\|@common\|common/" server/src/

# Find common tests
find common -name "*.test.ts" -o -name "*.spec.ts"

# Find barrel exports in common
rg -n "^export" common/index.ts common/*/index.ts
```

## Common Gotchas

- **Environment Detection**: Always check if platform-specific functionality is available
- **Bundle Size**: Common code is included in both client and server bundles, so keep it minimal
- **Dependency Management**: Changes to common dependencies may affect both client and server
- **Testing**: Common modules may need to be tested in both Node.js and browser-like environments

## Pre-PR Checks
```bash
npm run type-check && npm run test -- --testNamePattern="common"
```