# Active Context

## Current Work Focus

Populating the memory bank with detailed information about existing files, functions, and components to establish a comprehensive understanding of the project.

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

1.  **Document Findings**: Continuously update the memory bank files, especially `systemPatterns.md` and `progress.md`, with detailed insights gained from the inspection.

## Key Functionalities (Detailed)

### Authentication Flow

1.  **User attempts to access the application:**
    *   If not authenticated, the user is redirected to `LoginPage.tsx`.
2.  **`LoginPage.tsx`:**
    *   Presents a "Sign in with Microsoft" button.
    *   On click, `useAuth().login()` is called.
3.  **`useAuth` hook (in `src/auth/useAuth.ts`):**
    *   Provides access to `AuthContext`.
4.  **`AuthProvider.tsx` (in `src/auth/AuthProvider.tsx`):**
    *   Manages authentication state (`isAuthenticated`, `user`, `loading`, `error`).
    *   Uses `@azure/msal-react` (`useMsal`) for MSAL integration.
    *   **Development Mode:**
        *   Uses mock user data stored in `localStorage` for quick development.
        *   `login()` and `logout()` functions simulate authentication by setting/clearing `localStorage` items.
    *   **Production Mode:**
        *   Attempts to authenticate via Azure Static Web Apps (`/.auth/me` endpoint).
        *   Falls back to MSAL accounts if AWA auth not found.
        *   `getTokenSilently()` attempts to acquire a token silently; if it fails due to `InteractionRequiredAuthError`, it attempts interactive login via a popup.
        *   `login()` initiates interactive login via a popup.
        *   `logout()` redirects to `/.auth/logout` for Azure AD logout.
5.  **Frontend API Calls (`src/utils/api.ts`):**
    *   `authFetch` function is used for all authenticated API calls.
    *   It checks `import.meta.env.VITE_AUTH_ENABLED`. If `false`, authentication is skipped.
    *   If authentication is enabled, it fetches authentication status from `/api/auth/status`.
    *   If authentication is required, it calls `getAuthToken()` (which is an alias for `useAuth().getAccessToken()`) to retrieve a Bearer token.
    *   The token is then added to the `Authorization` header of the request.
6.  **Backend Authentication Middleware:**
    *   **`server/src/middleware/authLogger.ts`**: Logs authentication attempts and errors.
    *   **`server/src/middleware/auth.ts`**: 
        *   `validateToken`: Middleware for JWT token validation using `jsonwebtoken` and `jwks-rsa` (for Azure AD). Supports development mock tokens.
        *   `authenticateToken`: A more general middleware for JWT token validation.
        *   `checkRole`: Middleware for role-based access control.
    *   **`server/src/middleware/apiKeyAuth.ts`**: 
        *   `apiKeyAuth`: Middleware for API key authentication. Validates API keys against `ApiKeyRepository`.
        *   `requireAuthOrApiKey`: Combines Azure AD and API key authentication, prioritizing Azure AD.
    *   **`server/src/middleware/authMiddleware.ts`**: Provides the combined `requireAuthOrApiKey` middleware used in `server.ts`.
7.  **Backend API Routes (`server/src/routes/auth.route.ts`):**
    *   `/api/auth/status`: Endpoint to check if authentication is enabled on the server.

### Excel Upload and Ingestion Flow

1.  **User navigates to Upload Page:**
    *   `UploadPage.tsx` provides a UI for file selection and upload.
2.  **File Selection/Drop:**
    *   `FileUpload.tsx` component (using `react-dropzone`) handles drag-and-drop or file selection.
    *   It validates file type (`.xlsx`, `.xls`, `.csv`) and size (max 10MB).
3.  **File Upload Initiation:**
    *   When a file is selected and the "Upload" button is clicked, `handleFileUpload` in `UploadPage.tsx` is triggered.
    *   It sets `isUploading` state to `true` and `uploadProgress` to `0`.
    *   It creates a `FormData` object and appends the selected file.
    *   It explicitly retrieves an authentication token using `getAuthToken()` from `src/utils/api.ts`.
    *   It calls `api.post()` to send the `FormData` to the backend endpoint `/api/v2/query/imports`.
    *   `onUploadProgress` callback updates the `uploadProgress` state for UI feedback.
4.  **Backend Processing (`server/src/routes/v2/upload.route.ts` - implicitly, as it's mounted in `server.ts`):**
    *   The `uploadRoute` (from `server/src/routes/v2/upload.route.ts`) handles the incoming file upload.
    *   It likely uses `multer` middleware to parse the incoming `FormData` and extract the file buffer.
    *   It then calls `ingestionService.importFile()`.
5.  **Ingestion Service (`server/src/services/ingestion/ingestion.service.ts`):**
    *   `importFile()` orchestrates the ingestion process:
        *   Generates a unique `importId`.
        *   Uploads the original file to Azure Blob Storage using `uploadToBlobStorage()` (from `server/src/services/blob-storage/upload-to-blob-storage.ts` - implicitly, as it's used by `ingestion.service.ts`).
        *   Saves initial import metadata to Cosmos DB (`excel-records` container, `imports` partition key) using `saveImportMetadata()`.
        *   Parses the file using `fileParserService.parseFile()` (from `server/src/services/file-parser/file-parser.service.ts`).
            *   During parsing, `transformRow` callback adds system fields (`_importId`, `_rowNumber`, `_importedAt`, `_importedBy`) to each row.
        *   Updates import metadata with parse results (headers, total rows, valid rows, errors).
        *   Saves parsed rows to Cosmos DB in batches using `saveRows()`.
        *   Updates the import status to `completed` (or `failed` if errors occur) and saves the final metadata.
6.  **Cosmos DB Interaction (`server/src/services/cosmos-db/cosmos-db.service.ts`):**
    *   `initializeCosmosDB()`: Ensures connection to Cosmos DB and creates necessary database/containers.
    *   `upsertRecord()`: Used by `saveImportMetadata()` and `saveRows()` to persist data.
7.  **Blob Storage Interaction (`server/src/services/blob-storage/blob-storage.service.ts`):**
    *   `initializeBlobStorageAsync()`: Initializes the Blob Storage client.
    *   `uploadFile()`: Used by `ingestion.service.ts` to store the original Excel/CSV file.
8.  **Frontend Feedback:**
    *   On successful upload, `UploadPage.tsx` displays a success toast with processed row count and an action to "View Files" (navigates to dashboard).
    *   On failure, an error toast is displayed.

### Data Visualization and Querying Flow

1.  **User navigates to Dashboard Page:**
    *   `DashboardPage.tsx` is the main component for data visualization and querying.
2.  **Initial Data Load (Available Fields):**
    *   On mount, `DashboardPage.tsx` calls `loadAvailableFields()` (a `useCallback` hook).
    *   `loadAvailableFields()` makes an API call to `/api/fields` using `api.get()`.
    *   **Backend (`server/src/routes/fields.route.ts`):**
        *   The `/api/fields` endpoint retrieves a sample of records from the Cosmos DB `excel-records` container.
        *   It extracts all unique field names (excluding system properties) and returns them.
    *   `DashboardPage.tsx` receives these field names and transforms them into `FieldDefinition` objects, then sets `fieldDefinitions` state.
    *   It also sets initial `selectedFields` (first 5 fields by default).
3.  **Query Building (Frontend):**
    *   `DashboardPage.tsx` renders `QueryBuilder` component, passing `fieldDefinitions`, `selectedFields`, `onFieldsChange`, and `onExecute` props.
    *   **`QueryBuilder.tsx`:**
        *   Renders `FieldSelector` for selecting fields to display.
        *   Renders `FilterControls` for building query filters.
    *   **`FieldSelector.tsx`:**
        *   Allows users to select/deselect fields from `fieldDefinitions`.
        *   Updates `selectedFields` state in `DashboardPage.tsx` via `onFieldsChange`.
    *   **`FilterControls.tsx`:**
        *   Allows users to add multiple filter conditions (field, operator, value).
        *   Manages filter state internally and updates `QueryBuilder.tsx` via `onFiltersChange`.
4.  **Query Execution:**
    *   When the "Execute Query" button in `QueryBuilder.tsx` is clicked, `handleExecuteClick` is triggered.
    *   It constructs a query object including `fields`, `limit`, and `offset`.
    *   It calls `onExecute()` prop, which is `executeQuery()` in `DashboardPage.tsx`.
    *   `executeQuery()` makes an API call to `/api/v2/query/rows` using `api.post()`, sending the constructed query object in the request body.
    *   **Backend (`server/src/routes/v2/query/index.ts` and `server/src/routes/v2/query/handlers/query-rows-exact.handler.ts`):**
        *   The `/api/v2/query/rows` (POST) endpoint receives the query.
        *   `queryRowsExactHandler` constructs a Cosmos DB SQL query dynamically based on the requested fields, filters, limit, and offset.
        *   It executes the query against the Cosmos DB `excel-records` container.
        *   It also executes a separate count query to get the total number of matching records.
        *   Returns `items` (query results), `total` count, and pagination information.
5.  **Data Display and Visualization (Frontend):**
    *   `DashboardPage.tsx` receives the query results and updates `queryResult` state.
    *   It renders the results in a `Table` component.
    *   It also renders `DataChart` component, passing the `items` for visualization.
    *   **`DataChart.tsx`:**
        *   Allows users to select different chart types (bar, line, pie, table).
        *   Uses `recharts` library to render interactive charts based on the selected chart type and data.
        *   Provides options to select X and Y axes from available fields.
        *   Includes an "Export" button to download data (CSV/JSON).
6.  **Pagination and Sorting:**
    *   `DashboardPage.tsx` handles pagination logic (Previous/Next buttons) by updating the `page` state and re-executing the query with the new offset.
    *   It also handles sorting by updating `sortField` and `sortDirection` states and re-executing the query with the new sort parameters.

### API Key Management Flow

1.  **User navigates to API Key Management Section (Implicit):**
    *   While not explicitly shown as a separate page in the frontend, the `apiKey.route.ts` suggests there's a UI for managing API keys.
2.  **Create API Key:**
    *   A frontend component (e.g., a form) would allow a user to provide a `name`, optional `expiresAt`, and `allowedIps` for a new API key.
    *   This data is sent via `api.post()` to `/api/keys`.
    *   **Backend (`server/src/routes/apiKey.route.ts`):**
        *   The `POST /api/keys` endpoint receives the request.
        *   `express-validator` validates the input (`name`, `expiresAt`, `allowedIps`).
        *   It checks if the user has exceeded `API_KEY_MAX_KEYS_PER_USER`.
        *   `apiKeyRepository.createApiKey()` is called.
    *   **`ApiKeyRepository.ts` (`server/src/repositories/apiKeyRepository.ts`):**
        *   `createApiKey()` generates a new API key string using `generateApiKey()` (from `server/src/utils/apiKeyUtils.ts`).
        *   It hashes the API key using `hashApiKey()` (from `server/src/utils/crypto.ts`) for secure storage.
        *   The API key metadata (hashed key, name, user ID, expiration, allowed IPs) is stored in Cosmos DB.
        *   The plain-text API key is returned to the frontend *only once* for the user to record.
3.  **List API Keys:**
    *   A frontend component would make a `api.get()` request to `/api/keys`.
    *   **Backend (`server/src/routes/apiKey.route.ts`):**
        *   The `GET /api/keys` endpoint receives the request.
        *   `apiKeyRepository.listApiKeys()` is called.
    *   **`ApiKeyRepository.ts`:**
        *   `listApiKeys()` queries Cosmos DB for all API keys associated with the authenticated user.
        *   It returns the API key metadata, *excluding* the sensitive `keyHash`.
4.  **Revoke API Key:**
    *   A frontend component would allow a user to select an API key to revoke.
    *   A `api.delete()` request is sent to `/api/keys/:keyId`.
    *   **Backend (`server/src/routes/apiKey.route.ts`):**
        *   The `DELETE /api/keys/:keyId` endpoint receives the request.
        *   `express-validator` validates `keyId`.
        *   `apiKeyRepository.revokeApiKey()` is called.
    *   **`ApiKeyRepository.ts`:**
        *   `revokeApiKey()` updates the `isActive` status of the specified API key to `false` in Cosmos DB.
5.  **API Key Usage Tracking:**
    *   **Backend Middleware (`server/src/middleware/authMiddleware.ts` and `server/src/middleware/apiKeyAuth.ts`):**
        *   When an API key is used for an authenticated request, the `apiKeyAuth` middleware validates it.
        *   After a successful request, `ApiKeyUsageRepository.logUsage()` is called (implicitly, as it's part of the `AuthDependencies` passed to `requireAuth`).
    *   **`ApiKeyUsageRepository.ts` (`server/src/repositories/apiKeyUsageRepository.ts`):**
        *   `logUsage()` records details of the API request (timestamp, API key ID, user ID, method, path, status code, IP address, user agent, response time) in Cosmos DB.
        *   These usage records have a Time-To-Live (TTL) for automatic expiration.
6.  **API Key Usage Statistics/Activity (Implicit):**
    *   The `ApiKeyUsageRepository` also provides `getUsageStats()` and `getRecentActivity()` methods, which would be exposed via backend API routes (not explicitly defined in the provided routes, but implied by the repository's existence) to allow users to monitor their API key usage.