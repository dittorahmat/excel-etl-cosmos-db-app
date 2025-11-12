# Server Backend AGENTS.md

## Package Identity

Backend API service for the Excel-to-Cosmos DB application.
- **Purpose**: Handles Excel file uploads, Cosmos DB operations, and API endpoints
- **Framework**: Express.js with TypeScript, Azure Cosmos DB integration

## Setup & Run

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev              # Watch mode with auto-restart
npm run build            # Compile TypeScript
npm start                # Run production build
```

### Testing Commands
```bash
npm run test:server      # Run server unit tests
npm run test:coverage    # Run with coverage
npm run test:watch       # Watch mode for tests
```

### Type Checking & Linting
```bash
npm run type-check       # Type check only
npm run lint            # Run ESLint
```

## Patterns & Conventions

### File Organization
- `routes/` → Express route handlers
- `services/` → Business logic services
- `repositories/` → Data access layer
- `middleware/` → Express middleware
- `utils/` → Helper functions
- `types/` → TypeScript definitions

### API Route Conventions
- ✅ DO: Use router files for route grouping like `server/src/routes/v2/query/index.ts`
- ✅ DO: Follow RESTful patterns with proper HTTP verbs
- ❌ DON'T: Put business logic directly in route handlers
- ✅ DO: Use validation middleware (`express-validator`)

### Cosmos DB Query Patterns
- ✅ DO: Use iterators for large result sets like in `server/src/routes/v2/query/handlers/query-rows-get.handler.ts`
- ✅ DO: Avoid `.fetchAll()` or `.fetchAllResources()` to prevent memory issues
- ✅ DO: Use proper partition keys for efficient queries
- ❌ DON'T: Load entire collections into memory

### Error Handling
- ✅ DO: Use try/catch blocks for async operations
- ✅ DO: Pass errors to Express error middleware: `next(error)`
- ✅ DO: Use custom error classes for API responses

### Environment Configuration
- ✅ DO: Use `dotenv` for environment variables like in `server/src/config/env.ts`
- ✅ DO: Validate required environment variables on startup
- ✅ DO: Use separate configs for different environments

## Touch Points / Key Files

- **Main Server Entry**: `server.ts`
- **Environment Config**: `config/env.ts`  
- **Cosmos DB Service**: `services/cosmos-db/cosmos-db.service.ts`
- **API Routes**: `routes/v2/query/index.ts`
- **Authentication**: `middleware/auth.ts`
- **Logging**: `utils/logger.ts`

## JIT Index Hints

```bash
# Find all Cosmos DB queries
rg -n "container.items.query\|items.query\|fetchNext\|hasMoreResults" server/src/

# Find API route handlers
rg -n "router.\|app.\|express." server/src/routes/

# Find service implementations
rg -n "export class.*Service\|export const.*Service" server/src/services/

# Find middleware
rg -n "export const.*Middleware\|function.*Middleware" server/src/middleware/

# Find tests in this package
find . -name "*.test.ts" -o -name "*.spec.ts" | head -10

# Find TypeScript interfaces/types
rg -n "export interface\|export type" server/src/types/
```

## Common Gotchas

- **Memory Leaks**: Always use Cosmos DB iterators instead of `.fetchAll()` for large datasets
- **Async Handling**: Use `.hasMoreResults()` and `.fetchNext()` patterns for Cosmos DB queries
- **Environment Loading**: Environment variables are loaded in `config/env.ts` at startup
- **Partition Keys**: Always specify partition keys in Cosmos DB queries for optimal performance

## Pre-PR Checks
```bash
npm run type-check && npm run test:server && npm run lint
```