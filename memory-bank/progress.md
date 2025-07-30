## Progress

- **What works:**
    - ETL process (Excel to Cosmos DB) is functional.
    - Azure AD authentication is integrated (client and server-side).
    - API Key Management page is functional.
    - API Query Builder is functional with sample data.
    - Client-side and server-side tests are passing.
    - Server-side authentication bypass for testing is implemented.
    - Unit tests for `azure-services.ts` are created.
- **What's left to build:**
    - Improve code coverage for `server/src/config/azure-services.ts` and `server/src/services/blob-storage/blob-storage.service.ts`.
    - Investigate and address Vite build warnings.
- **Current status:** The application is in a stable state with core functionalities working. Focus is now on improving code quality and addressing performance warnings.
- **Known issues:**
    - Low code coverage in some server-side service files.
    - Vite build warning regarding large chunk sizes.
- **Evolution of project decisions:**
    - Initial focus on core ETL and authentication.
    - Shifted to improving test coverage and addressing build warnings for better maintainability and performance.
