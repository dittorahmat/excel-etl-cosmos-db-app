# Testing Strategy

## Overview
This project employs a multi-layered testing strategy to ensure reliability, performance, and correctness across the entire stack.

## Testing Tools
- **Unit & Integration:** [Vitest](https://vitest.dev/)
- **End-to-End (E2E):** [Playwright](https://playwright.dev/)
- **API Testing:** [Supertest](https://github.com/ladjs/supertest)
- **Data Mocking:** [@faker-js/faker](https://fakerjs.dev/)
- **Component Testing:** [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Test Structure
- **Unit Tests:** Located alongside source files (`__tests__/`) or in the `test/` directory.
- **Server Tests:** `vitest.server.config.ts` handles Node.js/Express environment tests.
- **Client Tests:** `vitest.client.config.ts` handles JSDOM environment tests.
- **Shared Tests:** `tests/shared` for code in the `common/` directory.
- **E2E Tests:** Located in the `e2e/` directory.
- **Specialized Tests:**
  - `contract-tests/`: To ensure API consistency.
  - `mutation-tests/`: To verify test suite effectiveness.
  - `performance-tests/`: To track application responsiveness and throughput.

## Commands
- `npm test`: Runs all Vitest tests once.
- `npm run test:watch`: Runs tests in interactive watch mode.
- `npm run test:coverage`: Generates code coverage report using the `v8` provider.
- `npm run test:server`: Specifically targets backend tests.
- `npm run test:client`: Specifically targets frontend tests.
- `npm run test:e2e`: Executes Playwright end-to-end tests.
- `npm run test:mutation`: Runs mutation tests.
- `npm run test:performance`: Runs performance benchmarks.

## Best Practices
- **AAA Pattern:** Arrange, Act, Assert.
- **Deterministic Tests:** Avoid reliance on external state or time; use mocks and fakes.
- **Mocking:**
  - Use `vi.mock()` for external modules.
  - Use `supertest` for mocking Express requests.
  - Use factory functions to generate consistent test data.
- **Naming:** Test files should use `.test.ts`, `.spec.ts`, `.test.tsx`, or `.spec.tsx` extensions.

## Coverage Targets
- **Overall Code Coverage:** 80% (aimed)
- **Critical Paths:** 90%+ (Auth, Data ETL, Cosmos DB interactions)
- **New Features:** Mandatory 100% coverage for new business logic.

## CI/CD Integration
Tests are integrated into the deployment pipeline. Successful test execution is a prerequisite for deployment to Azure or Docker environments.
