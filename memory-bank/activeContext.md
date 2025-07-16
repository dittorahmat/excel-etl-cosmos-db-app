# Active Context

## Current Work Focus

Improving test coverage, starting with client-side components.

## Recent Changes

*   **Memory Bank Initialization**: Created and populated initial `projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, and `progress.md` files.
*   **Frontend Deep Dive - Authentication**: Examined `LoginPage.tsx`, `useAuth.ts`, `AuthContext.ts`, and `AuthProvider.tsx` to understand the Azure AD authentication flow, including MSAL integration, mock authentication for development, and handling of silent and interactive token acquisition.
*   **Frontend Deep Dive - Dashboard**: Reviewed `DashboardPage.tsx`, identifying its role in data display, query building, visualization, file listing, dynamic field loading, data fetching, pagination, sorting, and error handling. Noted its reliance on `useAuth`, `api`, `shadcn/ui` components, `QueryBuilder`, `DataChart`, and `FileListTable`.
*   **Frontend Deep Dive - Upload**: Reviewed `UploadPage.tsx`, understanding its client-side file upload logic, state management for progress, API integration for sending `FormData` to `/api/v2/query/imports`, explicit authentication token retrieval, progress tracking, user feedback via toasts, and navigation to the dashboard post-upload.
*   **Frontend Deep Dive - QueryBuilder**: Reviewed `src/components/QueryBuilder/QueryBuilder.tsx`, understanding its role as the main query building component, integrating `FieldSelector` and `FilterControls`. Noted its state management for selected fields and filters, and its `onExecute` prop for triggering queries.
*   **Frontend Deep Dive - FieldSelector**: Reviewed `src/components/QueryBuilder/FieldSelector.tsx`, understanding its role as a reusable component for selecting fields. Noted its use of `shadcn/ui` components (`Popover`, `Command`, `Button`, `Label`, `Badge`), its handling of search functionality, and its display of selected fields as removable badges.
*   **Frontend Deep Dive - FilterControls**: Reviewed `src/components/QueryBuilder/FilterControls.tsx`, understanding its role in managing query filters. Noted its dynamic rendering of field, operator, and value inputs based on field types, and its extensive use of `shadcn/ui` components.
*   **Frontend Deep Dive - DataChart**: Reviewed `src/components/DataChart.tsx`, understanding its responsibility for data visualization using various chart types (bar, line, pie, table). Noted its use of `recharts` for charting, `shadcn/ui` for UI controls, and its data export functionality.
*   **Frontend Deep Dive - FileListTable**: Reviewed `src/components/FileListTable.tsx`, understanding its role in displaying a paginated list of uploaded files. Noted its use of `api` for data fetching, `shadcn/ui` for table rendering, and its functionality for downloading and deleting files.
*   **Frontend Deep Dive - FileUpload**: Reviewed `src/components/upload/FileUpload.tsx`, understanding its role in providing a drag-and-drop interface for file uploads. Noted its use of `react-dropzone` for drag-and-drop, `lucide-react` for icons, and its handling of file type/size validation, progress display, and error handling.
*   **Frontend Deep Dive - UI Components**: Explored `src/components/ui/` and confirmed the extensive use of `shadcn/ui` components, which are built on Radix UI and styled with Tailwind CSS, providing a consistent and accessible UI foundation.
*   **Backend Deep Dive - Server Entry Point**: Reviewed `server/src/server.ts`, understanding its role as the Express application setup, middleware configuration (CORS, JSON, logging, authentication, rate limiting), route definition (API v1 and v2, health checks), Azure services initialization (Cosmos DB), and server lifecycle management (startup/shutdown).
*   **Backend Deep Dive - API Routes (v2)**: Examined `server/src/routes/v2/index.ts` and `server/src/routes/v2/query/index.ts`, understanding the modular organization of v2 API routes, particularly for query-related operations (fetching, listing, downloading imports, and querying rows). Noted the conditional application of authentication middleware.
*   **Backend Deep Dive - API Routes (API Key Management)**: Reviewed `server/src/routes/apiKey.route.ts`, understanding its role in defining API routes for creating, listing, and revoking API keys. Noted its use of `express-validator` for validation, `ApiKeyRepository` for data interaction, and its application of authentication and rate-limiting middleware.
*   **Backend Deep Dive - API Routes (Authentication Status)**: Reviewed `server/src/routes/auth.route.ts`, understanding its role in providing an endpoint (`/api/auth/status`) to check if authentication is enabled on the server.
*   **Backend Deep Dive - API Routes (Data Query v1)**: Reviewed `server/src/routes/data.route.ts`, understanding its role in defining a v1 API route for querying data from Cosmos DB. Noted its support for filtering by date range, category, and dynamic fields, as well as pagination, and its dynamic Cosmos DB SQL query construction.
*   **Backend Deep Dive - API Routes (Fields)**: Reviewed `server/src/routes/fields.route.ts`, understanding its role in providing an API route (`/api/fields`) to retrieve a list of unique field names from Cosmos DB, used for dynamic query building in the frontend.
*   **Backend Deep Dive - Services (Blob Storage)**: Reviewed `server/src/services/blob-storage/blob-storage.service.ts`, understanding its role in initializing and interacting with Azure Blob Storage, including functions for uploading and deleting files, and its mock implementation for development.
*   **Backend Deep Dive - Services (Cosmos DB)**: Reviewed `server/src/services/cosmos-db/cosmos-db.service.ts`, understanding its role in initializing and interacting with Azure Cosmos DB. Noted its functions for connecting to Cosmos DB, upserting records, executing queries, retrieving records by ID, and deleting records. Identified it as a core component for data persistence.
*   **Backend Deep Dive - Services (File Parser)**: Reviewed `server/src/services/file-parser/file-parser.service.ts`, understanding its role in parsing Excel and CSV files. Noted its use of `xlsx` and `csv-parser`, and its support for various parsing options and file types. Identified it as crucial for the ETL process.
*   **Backend Deep Dive - Services (Ingestion)**: Reviewed `server/src/services/ingestion/ingestion.service.ts`, understanding its role in orchestrating the entire data ingestion process. Noted its functions for importing files (uploading to blob storage, parsing, batch saving to Cosmos DB, and updating metadata), and its methods for managing import metadata and rows.
*   **Backend Deep Dive - Repositories (API Key)**: Reviewed `server/src/repositories/apiKeyRepository.ts`, understanding its role in managing API key data in Cosmos DB. Noted its methods for validating, creating, revoking, listing, and updating API keys.
*   **Backend Deep Dive - Repositories (API Key Usage)**: Reviewed `server/src/repositories/apiKeyUsageRepository.ts`, understanding its role in tracking and retrieving API key usage data in Cosmos DB. Noted its methods for logging usage, getting aggregated statistics, and fetching recent activity.
*   **Backend Deep Dive - Middleware (Authentication)**: Reviewed `server/src/middleware/auth.ts`, understanding its role in JWT token validation and role-based access control using `jsonwebtoken` and `jwks-rsa` for Azure AD integration. Noted its support for development mock tokens and conditional authentication.
*   **Backend Deep Dive - Middleware (API Key Authentication)**: Reviewed `server/src/middleware/apiKeyAuth.ts`, understanding its role in handling API key authentication, including checking for API keys in headers/query parameters, validating them using `ApiKeyRepository`, and attaching key info to the request. Noted its `requireAuthOrApiKey` function for combined authentication.
*   **Backend Deep Dive - Middleware (Authentication Logger)**: Reviewed `server/src/middleware/authLogger.ts`, understanding its role in logging authentication attempts and errors, including request details, response status, user information, and an error handler for authentication failures.
*   **Backend Deep Dive - Middleware (Combined Authentication)**: Reviewed `server/src/middleware/authMiddleware.ts`, understanding its role in providing a combined authentication middleware that supports both API key authentication and Azure AD authentication, prioritizing Azure AD. Noted its use of `ApiKeyRepository` for API key validation and `requireRole` for role-based access control.
*   **Backend Deep Dive - Middleware (Error Handling)**: Reviewed `server/src/middleware/errorHandler.ts`, understanding its role in centralized error handling for the Express application. Noted its functions for logging errors, setting HTTP status codes, and constructing standardized JSON error responses for various error types.
*   **Backend Deep Dive - Middleware (Rate Limiting)**: Reviewed `server/src/middleware/rateLimit.ts`, understanding its implementation of rate limiting using `express-rate-limit` with a custom `MemoryStore`. Noted its configurable `windowMs`, `max` requests, and `keyGenerator`, and its specific rate limiters for general API and authentication endpoints.
*   **Backend Deep Dive - Middleware (Request Validation)**: Reviewed `server/src/middleware/validateRequest.ts`, understanding its role in providing middleware for request validation using `express-validator`. Noted its `validateRequest` function for running validation chains and `handleValidationErrors` for handling validation errors.
*   **Backend Deep Dive - Utilities (API Key)**: Reviewed `server/src/utils/apiKeyUtils.ts`, understanding its role in providing utility functions for generating, hashing, and validating API keys using Node.js's `crypto` module.
*   **Backend Deep Dive - Utilities (Authentication)**: Reviewed `server/src/utils/authUtils.ts`, understanding its role in providing utility functions related to authentication, including backend token acquisition using `@azure/msal-node` and role-based access control. Noted its helper to extract tokens from the Authorization header.
*   **Backend Deep Dive - Utilities (Cryptography)**: Reviewed `server/src/utils/crypto.ts`, understanding its role in providing utility functions for cryptographic operations, specifically for hashing and comparing API keys using Node.js's `crypto` module. Noted its mock implementation for the test environment.
*   **Backend Deep Dive - Utilities (Excel Parser)**: Reviewed `server/src/utils/excelParser.ts`, understanding its role in parsing Excel files, extracting headers, and converting data into a structured JSON format with added metadata. Noted its use of the `xlsx` library.
*   **Backend Deep Dive - Utilities (Logging)**: Reviewed `server/src/utils/logger.ts`, understanding its role in setting up a comprehensive logging system using `winston`. Noted its custom log levels, console and file transports, and middleware for request, API key usage, and error logging.

## Next Steps

1.  **Write more tests to improve test coverage, focusing on client-side components.**
    *   Added tests for `DashboardPage.tsx` (initial render and field loading, fixed Vitest compatibility).
    *   Added tests for `UploadPage.tsx`.
    *   Added tests for `src/components/QueryBuilder/QueryBuilder.tsx`.
    *   Added tests for `src/components/QueryBuilder/FieldSelector.tsx`.
    *   Added tests for `src/components/QueryBuilder/FilterControls.tsx`.
    *   Added tests for `src/components/DataChart.tsx`.
    *   Added tests for `src/components/FileListTable.tsx`.
    *   Added tests for `src/components/upload/FileUpload.tsx`.
    *   Added tests for `src/components/auth/LoginButton.tsx`.
    *   Added tests for `src/components/auth/ProtectedRoute.tsx`.
    *   Added tests for `src/components/common/ErrorBoundary.tsx`.
    *   Added tests for `src/components/ui/alert.tsx`.
    *   Added tests for `src/components/ui/button.tsx`.
    *   Added tests for `src/components/ui/button-variants.ts`.
    *   Added tests for `src/components/ui/card.tsx`.
    *   Added tests for `src/components/ui/dialog.tsx`.
2.  **Document Findings**: Continuously update the memory bank files, especially `systemPatterns.md` and `progress.md`, with detailed insights gained from the inspection.