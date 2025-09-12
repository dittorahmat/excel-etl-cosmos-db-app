# Tests

This directory contains all tests for the application, organized by type:

## Structure

- `client/` - Client-side tests (React components, hooks, utilities)
- `server/` - Server-side tests (API routes, services, middleware)
- `shared/` - Shared tests (utilities, types, common functionality)
- `setup.ts` - Global test setup and mocks

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Types

- Unit tests - Test individual functions and components
- Integration tests - Test interactions between components/modules
- End-to-end tests - Test complete user workflows