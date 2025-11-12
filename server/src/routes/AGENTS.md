# API Routes AGENTS.md

## Package Identity

Express.js API routes for the Excel-to-Cosmos DB application.
- **Purpose**: Handle HTTP requests for Excel processing, Cosmos DB queries, and API interactions
- **Structure**: v2 REST API with modular route handlers

## Setup & Run

### Development
Routes are automatically loaded by the main server.

### Testing Commands
```bash
npm run test:server      # Run all server tests
npm run test:server -- --testNamePattern="route"  # Run route-specific tests
```

## Patterns & Conventions

### Route Organization
- `v2/` → Latest API version routes
- `v2/query/` → Data query endpoints
- `v2/upload/` → File upload endpoints  
- `v2/import/` → Data import endpoints
- Handler files in `handlers/` subdirectories

### Route Structure Conventions
- ✅ DO: Use modular route files following `route-name.route.ts` pattern like `server/src/routes/v2/query/file.route.ts`
- ✅ DO: Separate concerns with dedicated handler functions in `handlers/` directories
- ✅ DO: Use middleware for auth/validation before route handlers
- ❌ DON'T: Mix business logic with route definition

### Parameter Validation
- ✅ DO: Use `express-validator` for input validation
- ✅ DO: Validate both query parameters and request bodies
- ✅ DO: Sanitize inputs to prevent injection attacks

### Response Formatting
- ✅ DO: Use consistent response format: `{ success: boolean, data?: any, error?: string }`
- ✅ DO: Include proper HTTP status codes
- ✅ DO: Include request IDs for debugging: `X-Request-ID`

### Error Handling in Routes
- ✅ DO: Use centralized error middleware
- ✅ DO: Catch async errors and pass to next middleware: `next(error)`
- ✅ DO: Log errors with sufficient context for debugging

### Cosmos DB Integration
- ✅ DO: Use iterator patterns instead of fetchAll for large datasets
- ✅ DO: Handle pagination properly with continuation tokens
- ✅ DO: Include partition key in all queries for performance

## Touch Points / Key Files

- **API Entry Point**: `v2/index.ts`
- **Query Routes**: `v2/query/index.ts`  
- **Upload Routes**: `v2/upload.route.ts`
- **Route Handlers**: `v2/query/handlers/`
- **Query Building**: `v2/query/utils/query-builder.ts`
- **Filter Parsing**: `v2/query/utils/filter-parser.ts`

## JIT Index Hints

```bash
# Find all route definitions
rg -n "router.\|app.\|get\|post\|put\|delete" server/src/routes/

# Find specific endpoint patterns
rg -n "api/query\|api/upload\|api/import" server/src/routes/

# Find error handling patterns
rg -n "try {\|catch (\|next(error)\|res.status" server/src/routes/

# Find validation patterns
rg -n "body(\|query(\|param(\|validator\|validationResult" server/src/routes/

# Find Cosmos DB query patterns in routes
rg -n "container\|items.query\|queryIterator\|fetchNext" server/src/routes/

# Find route tests
find server/src/test -name "*route*" -name "*.test.ts"
```

## Common Gotchas

- **Route Order**: Place specific routes before generic ones to avoid conflicts
- **Async Errors**: Always wrap route handlers in try-catch or use express-async-handler
- **Memory Management**: Use iterator patterns when querying large Cosmos DB datasets
- **Parameter Validation**: Always validate and sanitize input parameters

## Pre-PR Checks
```bash
npm run test:server -- --testNamePattern="route" && npm run lint
```