# Active Context

## Current Work Focus

Improving the overall quality and stability of the codebase by addressing warnings and increasing test coverage.

## Successful Fixes

- **Build Error**: Resolved a TypeScript error in `server/src/middleware/auth.ts` related to an `instanceof` expression, which was blocking the production build.
- **Test Warnings**: Fixed accessibility warnings in the client-side tests for the `Dialog` component by adding the required `DialogDescription`.
- **Client-side Chunk Size Warning**: Implemented route-based lazy loading in `src/App.tsx` and adjusted `chunkSizeWarningLimit` in `vite.config.ts` to mitigate the large chunk size warning. While the warning persists, the bundle has been optimized as much as feasible without significant refactoring.
- **Server-side 401 Errors for API Keys**: Addressed 401 Unauthorized errors on `/api/keys` endpoints when `AUTH_ENABLED` is `false` by conditionally applying authentication middleware and mocking `req.user` in `server/src/routes/apiKey.route.ts`.
- **Client-side TypeError in ApiKeyManagementPage**: Fixed `TypeError: Cannot read properties of undefined (reading 'length')` in `ApiKeyManagementPage.tsx` by correcting the API response data access from `response.keys` to `response.data`.
- **API Query Builder 404 Route**: Resolved the 404 Not Found error for the `/api-query-builder` route by modifying the `configureServer` middleware in `vite.config.ts` to exclude paths starting with `/api` from being rewritten to `index.html`.
- **Sidebar Link**: Added a sidebar link for "API Query Builder" in `src/components/layout/Sidebar.tsx`.
- **API Fields Endpoint Data Format**: Modified `server/src/routes/fields.route.ts` to return field definitions in the `FieldDefinition` format (with `name`, `type`, and `label`) as expected by the `ApiQueryBuilder` component.
- **API Query Builder Visibility**: Ensured `FilterControls` are visible by default in `ApiQueryBuilder.tsx` by passing `defaultShowFilters={true}`.
- **Client-side Tests**: All client-side tests are now passing after fixing the `TypeError` in `ApiKeyManagementPage.tsx` and updating the `ApiQueryBuilder` test to reflect the default visibility of filter controls.
- **DashboardPage Field Loading**: Fixed `TypeError: fieldName.split is not a function` in `DashboardPage.tsx` by updating it to correctly process `FieldDefinition` objects from the `/api/fields` endpoint.
- **FieldSelector Key Prop Warning**: Addressed the "Each child in a list should have a unique "key" prop" warning in `FieldSelector.tsx` by adding a `key` prop to the mapped `<span>` element.
- **API Query Builder URL Encoding**: Implemented URL encoding for the `filters` parameter in the generated API URL within `ApiQueryBuilder.tsx`.
- **API Query Builder Server-Side Request Handling**: Created a new GET endpoint `/api/v2/query/rows-get` for the API Query Builder, and reverted the `/api/v2/query/rows` endpoint back to POST for the Dashboard's Query Builder. Updated `query-rows-exact.handler.ts` to correctly handle POST requests.
- **Dashboard Query Builder Results Not Showing**: Fixed the issue where the Dashboard Query Builder was not showing results due to the backend expecting `fields` in the request body for POST requests, but the frontend was sending it in the query string. The `query-rows-exact.handler.ts` was updated to read `fields`, `filters`, `limit`, and `offset` from `req.body`.
- **API Query Builder Generated URL**: Modified `ApiQueryBuilder.tsx` to generate a `curl` command with a `POST` request to `/api/v2/query/rows`, including the full base URL (`window.location.origin`) and the request body.
- **Linting Errors**: Fixed `no-undef` errors in `query-rows-exact.handler.ts` and `query-rows-get.handler.ts` by importing `FilterCondition`. Removed unused `Input` import from `ApiQueryBuilder.tsx` and `ApiQueryBuilder` import from `ApiKeyManagementPage.tsx`.
- **Build Errors**: Moved `filter-condition.ts` to `common/types` and updated `tsconfig.server.json` to include the new `common` directory and adjusted `rootDir` to `.` to resolve `rootDir` and module resolution errors. Also fixed type errors in `list-imports.handler.ts`, `query-rows-exact.handler.ts`, and `query-rows-get.handler.ts` related to `FilterCondition` and `value2` being `undefined`.
- **Test Coverage**: Increased test coverage for `server/src/middleware/errorHandler.ts` to 100% by adding comprehensive unit tests.

## Ongoing Debugging: None

**Current Status:**
- All known issues related to the API Query Builder's visibility, routing, and field loading have been addressed.
- The generated API URL should now be correctly formatted.
- The Query Builder on the Dashboard page should now correctly load fields and display results.
- All linting, type-checking, and build errors have been resolved.
- Test coverage for `errorHandler.ts` is now 100%.

## Next Steps

- Address the server test warning about authentication being disabled in the test environment.
- Improve the low code coverage for the server-side tests.
- Further investigate and address the Vite build warning about large chunk sizes if it becomes a performance bottleneck, potentially requiring deeper architectural changes.

## Important Patterns and Preferences

- Adherence to project conventions for code style and structure.
- Emphasis on robust error handling and comprehensive testing.

## Learnings and Project Insights

- The build and test pipeline is crucial for maintaining code quality. A successful build and passing tests provide a stable foundation for future development.
- Addressing warnings, even if they don't break the application, is important for long-term maintainability and preventing future issues.
- Debugging client-server interactions requires careful examination of both browser and server console logs to pinpoint the exact point of failure.
- Proper `tsconfig` configuration and module resolution are crucial for monorepos with shared code.

## Authentication Context

- Authentication is intentionally disabled in the test environment because the user is using a personal Microsoft account (Gmail) in the Azure directory and does not have the necessary permissions for full Azure AD integration yet.
- **Detailed Authentication Issue**: The current Azure AD configuration prevents personal Microsoft accounts (like Gmail) from signing into the application, even when invited as guest users with 'Application Developer' RBAC. The error message "You can't sign in here with a personal account. Use your work or school account instead." indicates that the Azure AD tenant is likely configured to only allow work or school accounts.
- **Resolution for Authentication Issue (Part 1)**: The Azure AD administrator needs to adjust two key settings:
    1.  **External Collaboration Settings**: In Azure Active Directory > External identities > **All identity providers** (or **Identity providers**), ensure that "Microsoft account" is enabled. This is where the option to allow personal Microsoft accounts resides, not directly under "External collaboration settings" as initially thought.
    2.  **Application Manifest**: In Azure Active Directory > App registrations, for the specific application, change the `signInAudience` property in the manifest from its current value (likely `AzureADMyOrg` or `AzureADMultipleOrgs`) to `AzureADandPersonalMicrosoftAccount`.
- **New Error Encountered**: When attempting to update the `signInAudience` to `AzureADandPersonalMicrosoftAccount`, an error occurred: "Application must accept Access Token Version 2".
- **Resolution for New Error (Part 2)**: To resolve this, the `accessTokenAcceptedVersion` property in the application manifest must also be set to `2`. This ensures the application is configured to accept access tokens from the v2.0 endpoint of the Microsoft identity platform.
- **Clarification on Manifest Types**: When editing the application manifest in Azure AD, always use the "**Microsoft Graph App Manifest (New)**" tab. The "AAD Graph App Manifest (Deprecating Soon)" is an older, deprecated format and should not be used for new configurations or updates.
