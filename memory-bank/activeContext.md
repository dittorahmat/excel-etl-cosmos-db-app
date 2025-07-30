## Active Context

- **Current Work Focus:** Improving code coverage for server-side services and investigating Vite build warnings.
- **Recent Changes:**
    - Fixed `AADSTS500011` error by correcting server-side JWT audience validation in `server/src/middleware/auth.ts`.
    - Fixed API Key Management Page 404 error by updating client-side API calls in `src/pages/ApiKeyManagementPage.tsx`.
    - Added sample data to Cosmos DB using `scripts/add-sample-data.ts` to enable field extraction for the API Query Builder.
    - Fixed `ApiQueryBuilder` tests by updating mock data to match Cosmos DB sample data in `src/components/ApiQueryBuilder/ApiQueryBuilder.test.tsx`.
    - Addressed server test authentication warning by explicitly setting bypass for `NODE_ENV=test` in `server/src/middleware/auth.ts`.
    - Created unit tests for `server/src/config/azure-services.ts` in `server/test/config/azure-services.test.ts`.
    - Debugged and fixed mocking issues in `server/test/config/azure-services.test.ts`.
    - Updated `vitest.server.config.ts` to include `server/src/**/*.ts` for coverage.
    - Fixed failing test case for `checkRole` middleware in `server/test/middleware/auth.test.ts`.
- **Next Steps:**
    1. Improve the low code coverage for `server/src/config/azure-services.ts` (currently 3.7% statements) and `server/src/services/blob-storage/blob-storage.service.ts` (currently 4.08% statements).
    2. Further investigate and address the Vite build warning about large chunk sizes if it becomes a performance bottleneck, potentially requiring deeper refactoring or bundle analysis.
- **Active Decisions and Considerations:**
    - Authentication is enabled. The previous issue with a personal Microsoft account (Gmail) in the Azure directory and lack of necessary permissions for full Azure AD integration has been resolved.
    - The `AZURE_CLIENT_ID` environment variable is used for audience validation on the server.
- **Learnings and Project Insights:**
    - Thorough testing, especially with mock data reflecting actual database structures, is crucial for robust application development.
    - Explicitly managing test environment configurations helps prevent unexpected authentication issues during testing.
    - Incremental improvements in code coverage contribute to overall code quality and stability.
