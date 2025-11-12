# Server Backend AGENTS.md

## Package Identity

Backend API server for the Excel-to-Cosmos DB application.
- **Purpose**: Handle API requests, Excel processing, Cosmos DB operations, and business logic
- **Framework**: Node.js, Express, TypeScript with Azure Cosmos DB integration

## Setup & Run

### Installation
```bash
cd server
npm install
```

### Development
```bash
npm run dev              # Watch mode with auto-restart
npm run build            # Compile TypeScript to JavaScript
npm start                # Start production build
```

### Testing Commands
```bash
npm run test             # Run all server tests
npm run test:watch       # Watch mode for tests
npm run test:coverage    # Generate coverage report
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking
```

## Patterns & Conventions

### Directory Structure
- `src/` → Server source code
- `src/routes/` → Express route handlers
- `src/services/` → Business logic services
- `src/repositories/` → Data access layer
- `src/middleware/` → Express middleware
- `src/config/` → Configuration files
- `src/types/` → TypeScript type definitions
- `src/utils/` → Utility functions
- `scripts/` → Server-specific scripts

### API Architecture Patterns
- ✅ DO: Use Express Router for organizing routes
- ✅ DO: Separate concerns with middleware for auth, validation, error handling
- ✅ DO: Follow RESTful API conventions where applicable
- ❌ DON'T: Put business logic directly in route handlers

### Cosmos DB Integration
- ✅ DO: Use iterator patterns instead of fetchAll to avoid memory issues 
- ✅ DO: Always specify partition keys for efficient queries
- ✅ DO: Implement proper pagination with continuation tokens
- ❌ DON'T: Load entire collections into memory with .fetchAll()

### Error Handling
- ✅ DO: Use centralized error handling middleware
- ✅ DO: Log errors with correlation IDs for debugging
- ✅ DO: Return appropriate HTTP status codes
- ❌ DON'T: Expose internal error details to clients

### Middleware Usage
- ✅ DO: Apply authentication and authorization before business logic
- ✅ DO: Validate request parameters and body content
- ✅ DO: Handle CORS and security headers appropriately

## Touch Points / Key Files

- **Server Entry Point**: `src/server.ts`
- **Environment Configuration**: `src/config/env.ts`
- **Route Definitions**: `src/routes/` directory
- **Cosmos DB Services**: `src/services/cosmos-db/`
- **Authentication**: `src/middleware/auth.ts`
- **API Documentation**: `src/docs/swagger.ts` or similar

## JIT Index Hints

```bash
# Find API routes
rg -n "router.\|app.\|express.Router\|get\|post\|put\|delete" server/src/

# Find Cosmos DB queries
rg -n "container\|queryIterator\|fetchNext\|hasMoreResults\|partitionKey" server/src/

# Find middleware usage
rg -n "middleware\|auth\|cors\|helmet" server/src/

# Find environment variable usage
rg -n "process.env\|dotenv\|config\|ENV" server/src/

# Find service implementations
rg -n "export.*class\|export.*function" server/src/services/

# Find repository patterns
rg -n "repository\|Repository\|db\|database" server/src/

# Find server tests
find server/src -name "*.test.ts" -o -name "*.spec.ts" | head -10

# Find error handling
rg -n "try {\|catch\|error\|logger.error" server/src/
```

## Common Gotchas

- **Memory Management**: Always use iterators instead of .fetchAll() for Cosmos DB queries to prevent memory exhaustion
- **Environment Variables**: Ensure all required environment variables are set before starting the server
- **Port Configuration**: The server runs on port 3000 by default (configurable via PORT environment variable)
- **Logging**: Use the centralized logger instead of console.log for proper log formatting

## Pre-PR Checks
```bash
npm run type-check && npm run test && npm run lint
```