# Active Context

## Problems Faced
-   Initial Tailwind CSS `@apply` issues with custom colors.
-   Inconsistent `node_modules` leading to module not found errors.
-   React version conflict caused by a post-build script injecting an older React CDN, leading to `useLayoutEffect` errors locally.
-   **Resolved: The `useLayoutEffect` error in Azure Static Web Apps deployment (previously attributed to CDN caching) was likely due to incorrect script loading order, now addressed by consolidating vendor chunks.**
-   **Resolved: Environment variable loading issues for the backend server, now addressed by using `start-server-direct.cjs`.**
-   **Resolved: ES Module compatibility issue preventing server startup, now fixed by adjusting TypeScript configuration and build output paths.**
-   **New Critical Issue: The frontend is unable to retrieve data from the backend.** This suggests an issue with API calls, CORS, or backend routing/functionality.

## Next Steps
1.  **Debug Backend Data Retrieval:**
    -   Verify network requests from the frontend to the backend (check browser developer console for failed requests, status codes, and response bodies).
    -   Examine backend server logs for incoming requests and any errors during processing.
    -   Confirm CORS configuration on the backend allows requests from the frontend's origin (`http://localhost:3000`).
    -   Verify API routes and their implementation on the backend.
2.  **Core ETL Logic:** (These are lower priority until the data retrieval issue is resolved)
    -   Refine Excel parsing logic in the Azure Function to handle various data types and structures.
    -   Implement robust data validation and transformation rules.
    -   Integrate with Azure Blob Storage for temporary file persistence.
    -   Implement Cosmos DB loading with proper error handling and batching.
3.  **Frontend Implementation:**
    -   Develop frontend component for file selection and upload.
    -   Implement status reporting and logging for ETL jobs.
4.  **Security:** Address authentication and authorization for production environment.
# Active Context

## Problems Faced
-   Initial Tailwind CSS `@apply` issues with custom colors.
-   Inconsistent `node_modules` leading to module not found errors.
-   React version conflict caused by a post-build script injecting an older React CDN, leading to `useLayoutEffect` errors locally.
-   **Resolved: The `useLayoutEffect` error in Azure Static Web Apps deployment (previously attributed to CDN caching) was likely due to incorrect script loading order, now addressed by consolidating vendor chunks.**
-   **Resolved: Environment variable loading issues for the backend server, now addressed by using `start-server-direct.cjs`.**
-   **Resolved: ES Module compatibility issue preventing server startup, now fixed by adjusting TypeScript configuration and build output paths.**
-   **New Critical Issue: The frontend is unable to retrieve data from the backend.** This suggests an issue with API calls, CORS, or backend routing/functionality.

## Next Steps
1.  **Debug Backend Data Retrieval:**
    -   Verify network requests from the frontend to the backend (check browser developer console for failed requests, status codes, and response bodies).
    -   Examine backend server logs for incoming requests and any errors during processing.
    -   Confirm CORS configuration on the backend allows requests from the frontend's origin (`http://localhost:3000`).
    -   Verify API routes and their implementation on the backend.
2.  **Core ETL Logic:** (These are lower priority until the data retrieval issue is resolved)
    -   Refine Excel parsing logic in the Azure Function to handle various data types and structures.
    -   Implement robust data validation and transformation rules.
    -   Integrate with Azure Blob Storage for temporary file persistence.
    -   Implement Cosmos DB loading with proper error handling and batching.
3.  **Frontend Implementation:**
    -   Develop frontend component for file selection and upload.
    -   Implement status reporting and logging for ETL jobs.
4.  **Security:** Address authentication and authorization for production environment.

## Learnings and Project Insights
-   Careful management of dependencies and build processes is crucial to avoid subtle conflicts, especially with library versions.
-   Azure AD setup for personal accounts (Gmail) in a test environment requires specific considerations and might lead to permission issues, hence authentication is temporarily disabled.
-   Careful planning of Cosmos DB partitioning keys is crucial for performance and cost.
-   Excel parsing can be complex due to varied user inputs; robust validation is key.
-   Applied global `bg-background` and `text-foreground` classes directly to the `<body>` tag in `index.html`.
-   **UI Fix**: Refined vertical alignment on landing page by increasing bottom padding to `pb-[80px]` (approx 80px total) to shift content further up.
-   Resolved `Cannot find module` errors by deleting `node_modules` and `package-lock.json` and reinstalling dependencies.
-   **Vite's chunking and script injection behavior can be complex; explicit control over vendor chunking and loading order is sometimes necessary.**
-   **Environment variable loading in Node.js applications can be tricky, especially with different execution contexts (e.g., `npm run` vs. direct `node` commands). Direct injection or robust `dotenv` configuration is key.**
-   **When debugging frontend-backend communication, always check both browser network requests and backend server logs.**
-   **TypeScript configuration for ES modules requires careful attention to `module` and `moduleResolution` settings, especially in projects with project references.**
-   **Properly configuring environment variable loading paths is important for monorepo structures to ensure components use their intended configurations.**