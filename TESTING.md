# Testing Strategy and Guidelines

## Overview

This document outlines the testing strategy for the Excel ETL Cosmos DB application. Our testing approach includes unit tests, integration tests, end-to-end tests, and performance tests to ensure the quality and reliability of our application.

## Test Structure

### 1. Unit Tests
- **Location**: `src/**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}` and `test/**/*.{test,spec}.{js,ts}`
- **Purpose**: Test individual functions, components, and modules in isolation
- **Framework**: Vitest with Testing Library for React components
- **Environment**: JSDOM for client-side, Node for server-side

### 2. Integration Tests
- **Location**: `test/test/**/*.{test,spec}.{js,ts}`
- **Purpose**: Test interactions between multiple modules or services
- **Framework**: Vitest
- **Environment**: Node with mocked external dependencies

### 3. End-to-End Tests
- **Location**: `e2e/tests/**/*.{test,spec}.{js,ts}`
- **Purpose**: Test user workflows and scenarios from the browser
- **Framework**: Playwright
- **Environment**: Real browser instances

### 4. Performance Tests
- **Location**: `performance/**/*.{test,spec}.{js,ts}`
- **Purpose**: Test application performance under various loads
- **Framework**: Artillery or custom scripts
- **Environment**: Dedicated performance testing environment

## Test Commands

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Run end-to-end tests
npm run test:e2e
```

### Coverage Reports

Coverage reports are generated in the `coverage/` directory when running tests with coverage enabled.

## Writing Tests

### 1. Unit Tests for React Components

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### 2. Unit Tests for Utility Functions

```ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './myFunction';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### 3. Integration Tests with Mocks

```ts
import { describe, it, expect, vi } from 'vitest';
import { myService } from './myService';

// Mock external dependencies
vi.mock('./externalService', () => ({
  externalFunction: vi.fn().mockResolvedValue('mocked result')
}));

describe('myService', () => {
  it('should work with mocked dependencies', async () => {
    const result = await myService();
    expect(result).toBe('expected result');
  });
});
```

## Test Best Practices

### 1. Naming Conventions
- Use descriptive test names that explain the expected behavior
- Follow the "it should..." pattern for test cases
- Group related tests in `describe` blocks

### 2. Test Structure
- Follow the AAA pattern: Arrange, Act, Assert
- Keep tests focused and test only one behavior per test
- Use setup and teardown functions appropriately

### 3. Mocking
- Mock external dependencies (APIs, databases, file systems)
- Use factory functions for creating test data
- Reset mocks between tests

### 4. Assertions
- Use specific assertions rather than generic ones
- Test both positive and negative cases
- Include edge cases in your tests

## Test Data Management

### Factory Functions
Use factory functions to generate consistent test data:

```ts
// src/test-utils/factories.ts
export const createUser = (overrides = {}) => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  ...overrides
});
```

### Mock Data
Use mock data files for complex test scenarios:

```ts
// test/__mocks__/data.ts
export const mockExcelData = [
  ['Name', 'Age', 'City'],
  ['John', 30, 'New York'],
  ['Jane', 25, 'Los Angeles']
];
```

## Continuous Integration

Tests are automatically run on every pull request and push to the main branch. The CI pipeline includes:

1. Unit and integration tests
2. End-to-end tests
3. Code coverage analysis
4. Performance tests for critical paths

## Troubleshooting

### Common Issues

1. **"document is not defined"**: Ensure you're using the correct test environment (jsdom for client-side tests)
2. **Module not found errors**: Check import paths and aliases in the vitest configuration
3. **Async test failures**: Use `async/await` and ensure promises are properly resolved

### Debugging Tests

1. Use `console.log` statements for debugging
2. Run specific tests with `.only` modifier
3. Use the `--inspect` flag for debugging Node.js tests

## Coverage Targets

- **Overall**: 80% coverage
- **Critical paths**: 90% coverage
- **New features**: 100% coverage

## Adding New Tests

1. Place tests in the appropriate directory based on their type
2. Follow the existing naming conventions
3. Use the established patterns for mocking and setup
4. Ensure tests are deterministic and don't rely on external state