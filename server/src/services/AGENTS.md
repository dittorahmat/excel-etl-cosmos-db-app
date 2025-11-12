# Backend Services AGENTS.md

## Package Identity

Business logic and data access services for the Excel-to-Cosmos DB application.
- **Purpose**: Handle core application logic, data processing, and external integrations
- **Structure**: Modular services for different business domains

## Setup & Run

### Development
Services are automatically loaded by route handlers and controllers.

### Testing Commands
```bash
npm run test:server      # Run all server tests including service tests
npm run test:server -- --testNamePattern="service"  # Run service-specific tests
```

## Patterns & Conventions

### Service Organization
- `cosmos-db/` → Cosmos DB related services
- `access-control/` → Authentication and authorization services  
- `file-processing/` → Excel file processing logic
- `utils/` → General utility services

### Service Architecture Patterns
- ✅ DO: Follow single responsibility principle - one service per domain
- ✅ DO: Use dependency injection where appropriate
- ✅ DO: Export services as classes with clearly defined public interfaces
- ❌ DON'T: Mix concerns across different service domains

### Cosmos DB Service Patterns
- ✅ DO: Use iterator patterns instead of fetchAll for large datasets like in `server/src/services/cosmos-db/cosmos-db.service.ts`
- ✅ DO: Implement proper error handling and retry logic
- ✅ DO: Use partition keys in queries for optimal performance
- ❌ DON'T: Load entire collections into memory

### Async/Await Best Practices
- ✅ DO: Always await async operations
- ✅ DO: Handle errors appropriately with try/catch
- ✅ DO: Use Promise.all() for parallel operations when appropriate
- ❌ DON'T: Ignore rejected promises

### Logging Standards
- ✅ DO: Log at appropriate levels (debug, info, warn, error)
- ✅ DO: Include correlation IDs for request tracing
- ✅ DO: Log enough context for debugging without exposing PII

### Error Handling in Services
- ✅ DO: Create custom error types for business logic errors
- ✅ DO: Maintain error context when bubbling errors up
- ✅ DO: Handle transient failures with appropriate retry logic

## Touch Points / Key Files

- **Cosmos DB Service**: `cosmos-db/cosmos-db.service.ts`
- **Enhanced Cosmos Service**: `cosmos-db/enhanced-cosmos-db.service.ts`
- **Access Control**: `access-control/database-access-control.service.ts`
- **File Processing**: `file-processing/excel-processor.service.ts`
- **Authentication**: `auth/authentication.service.ts`

## JIT Index Hints

```bash
# Find all service classes
rg -n "class.*Service\|export.*Service" server/src/services/

# Find service instantiations
rg -n "new.*Service\|inject\|provide" server/src/services/

# Find Cosmos DB service usage
rg -n "cosmosDb\|container\|items.query\|fetchNext" server/src/services/

# Find error handling in services
rg -n "try {\|catch (\|throw.*Error\|logger.error" server/src/services/

# Find service tests
find server/src/test -name "*service*" -name "*.test.ts"

# Find service interfaces/contracts
rg -n "interface.*Service\|abstract class.*Service" server/src/services/
```

## Common Gotchas

- **Memory Management**: In Cosmos DB services, always use iterators instead of fetchAll for large result sets
- **Async Operations**: Properly await all async operations to avoid race conditions
- **Resource Cleanup**: Close iterators and dispose of resources appropriately
- **Partition Key Usage**: Always include partition keys in queries to avoid cross-partition scans

## Pre-PR Checks
```bash
npm run test:server -- --testNamePattern="service" && npm run type-check
```