# Cosmos DB Services AGENTS.md

## Package Identity

Azure Cosmos DB integration services for the Excel-to-Cosmos DB application.
- **Purpose**: Handle all Cosmos DB operations including queries, data manipulation, and connection management
- **Structure**: Abstraction layers over Azure SDK with memory-efficient patterns

## Setup & Run

### Development
Cosmos DB services are automatically loaded by other services and route handlers.

### Testing Commands
```bash
npm run test:server -- --testNamePattern="cosmos"  # Run Cosmos DB service tests
npm run test:server -- --testNamePattern="db"     # Run DB-related tests
```

## Patterns & Conventions

### Cosmos DB Service Organization
- `cosmos-db.service.ts` → Core Cosmos DB operations
- `enhanced-cosmos-db.service.ts` → Advanced Cosmos DB operations with features like joins
- `utils/` → Helper functions for Cosmos DB operations
- `types/` → TypeScript definitions for Cosmos DB entities

### Query Pattern Standards
- ✅ DO: Use iterators instead of `.fetchAll()` to avoid memory issues as implemented in `server/src/services/cosmos-db/cosmos-db.service.ts`
- ✅ DO: Process results in chunks to prevent memory exhaustion
- ✅ DO: Use continuation tokens for pagination
- ❌ DON'T: Load entire result sets into memory with `.fetchAll()`

### Partition Key Usage
- ✅ DO: Always specify partition keys in queries for optimal performance
- ✅ DO: Structure data models to take advantage of partitioning
- ✅ DO: Use cross-partition queries sparingly and only when necessary
- ❌ DON'T: Perform cross-partition queries without considering performance impact

### Iterator Pattern Implementation
- ✅ DO: Use `hasMoreResults()` and `fetchNext()` pattern consistently
- ✅ DO: Handle asynchronous iteration properly with async/await
- ✅ DO: Process each batch of results before fetching the next batch

### Error Handling
- ✅ DO: Handle Cosmos DB specific errors (429 throttling, 409 conflicts, etc.)
- ✅ DO: Implement exponential backoff for retry logic
- ✅ DO: Log Cosmos DB operation details for troubleshooting

### Resource Management
- ✅ DO: Properly dispose of iterators after use
- ✅ DO: Monitor container and database RU consumption
- ✅ DO: Close connections appropriately

## Touch Points / Key Files

- **Core Service**: `cosmos-db.service.ts`
- **Enhanced Service**: `enhanced-cosmos-db.service.ts` (with join support and advanced features)
- **Connection Manager**: `connection-manager.service.ts` or similar connection handling
- **Query Builder**: `utils/query-builder.ts`
- **Partition Strategies**: `utils/partition-strategy.ts`

## JIT Index Hints

```bash
# Find all Cosmos DB query operations
rg -n "\.query(\|\.fetchAll\|fetchNext\|hasMoreResults\|iterator" server/src/services/cosmos-db/

# Find fetchAll replacements
rg -n "\.fetchAll\|\fetchNext(\|iterator" server/src/services/cosmos-db/

# Find query building patterns
rg -n "SELECT \|JOIN \|ORDER BY \|OFFSET \|LIMIT \|parameters" server/src/services/cosmos-db/

# Find partition key usage
rg -n "partitionKey\|_partitionKey\|partition" server/src/services/cosmos-db/

# Find error handling in Cosmos services
rg -n "try {\|catch (\|CosmosDBError\|statusCode\|retry" server/src/services/cosmos-db/

# Find Cosmos DB container/item operations
rg -n "container\|item\|items\|database" server/src/services/cosmos-db/

# Find Cosmos DB tests
find server/src/test -name "*cosmos*" -name "*.test.ts"
find server/src/test -name "*db*" -name "*.test.ts"
```

## Common Gotchas

- **Memory Leaks**: The most critical issue is using `.fetchAll()` which loads all results into memory; always use iterator patterns
- **Partition Queries**: Without proper partition keys, queries become expensive cross-partition operations
- **Rate Limiting**: Handle 429 (Too Many Requests) responses with appropriate retry logic
- **Continuation**: For large datasets, properly handle continuation tokens for seamless pagination
- **RU Consumption**: Monitor Request Unit consumption as complex queries can consume significant RUs

## Pre-PR Checks
```bash
npm run test:server -- --testNamePattern="cosmos" && npm run type-check
```