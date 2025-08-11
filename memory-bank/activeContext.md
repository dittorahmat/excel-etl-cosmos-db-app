# Active Context

## Current Work Focus
The primary focus remains on resolving the critical deployment issue with the Azure Static Web App: `Uncaught TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')`. This error persists despite local fixes and successful builds, indicating a CDN caching problem.

## Recent Changes
-   Resolved Tailwind CSS compilation errors by removing problematic `@apply` directives from `src/index.css`.
-   Applied global `bg-background` and `text-foreground` classes directly to the `<body>` tag in `index.html`.
-   Resolved `Cannot find module` errors by deleting `node_modules` and `package-lock.json` and reinstalling dependencies.
-   Identified and removed the conflicting React 18 CDN script injection (`scripts/add-cdn-scripts.cjs`) which was causing a React version mismatch with the project's React 19, resolving the `useLayoutEffect` error locally.
-   Attempted a clean deployment to Azure Static Web Apps, but the `useLayoutEffect` error persisted in the deployed environment.
-   Analyzed `index.html` and `vendor-radix-ui.BRZ-DTLm.js` content from the deployed site, confirming the `useLayoutEffect` error.
-   Reviewed GitHub Actions build logs, which showed successful build and deployment, reinforcing the CDN caching hypothesis.
-   Added a unique cache-busting comment to `index.html` to force the CDN to serve a fresh version.

## Problems Faced
-   Initial Tailwind CSS `@apply` issues with custom colors.
-   Inconsistent `node_modules` leading to module not found errors.
-   React version conflict caused by a post-build script injecting an older React CDN, leading to `useLayoutEffect` errors locally.
-   **Critical: The `useLayoutEffect` error persists in Azure Static Web Apps deployment despite local fixes and clean deployments.** This indicates a deeper issue with the Azure build or serving environment.
-   **Analysis of Azure Build Logs:** The GitHub Actions build logs show that `npm install` and `vite build` complete successfully, and the problematic `add-cdn-scripts.cjs` is *not* being executed. This suggests the issue is not with the build process itself, but primarily with CDN caching.
-   **Persistent `304 Not Modified` in Incognito:** The user reports that even in Incognito mode, JavaScript files show a `304 Not Modified` status, strongly indicating that the Azure CDN is serving a cached version of the old files.
-   **CDN Caching:** The primary problem is the aggressive caching by the Azure CDN, preventing the latest `index.html` (and potentially other assets) from being served, even after successful deployments. Direct CDN cache purging is not readily available for Azure Static Web Apps.

## Next Steps
1.  **User Action: Deploy the latest changes** (including the cache-busting comment in `index.html`) to Azure Static Web Apps.
2.  **Verify if the `useLayoutEffect` error is resolved** after the deployment.
3.  If the issue persists, further investigation into the deployed assets and potential alternative build/deployment strategies will be required.
4.  **Core ETL Logic:** (These are lower priority until the deployment issue is resolved)
    -   Refine Excel parsing logic in the Azure Function to handle various data types and structures.
    -   Implement robust data validation and transformation rules.
    -   Integrate with Azure Blob Storage for temporary file persistence.
    -   Implement Cosmos DB loading with proper error handling and batching.
5.  **Frontend Implementation:**
    -   Develop frontend component for file selection and upload.
    -   Implement status reporting and logging for ETL jobs.
6.  **Security:** Address authentication and authorization for production environment.

## Learnings and Project Insights
-   Careful management of dependencies and build processes is crucial to avoid subtle conflicts, especially with library versions.
-   Azure AD setup for personal accounts (Gmail) in a test environment requires specific considerations and might lead to permission issues, hence authentication is temporarily disabled.
-   Careful planning of Cosmos DB partitioning keys is crucial for performance and cost.
-   Excel parsing can be complex due to varied user inputs; robust validation is key.
-   **Azure Static Web Apps deployment can have subtle differences from local builds, requiring thorough investigation of build logs and deployed artifacts.**
-   **Browser and CDN caching can significantly impact the perceived state of a deployed application, even after successful deployments.**
-   **If no explicit CDN options are available in Azure Static Web Apps, it uses a built-in CDN where direct purging is not exposed. New deployments are the primary way to invalidate its cache.**
-   **The `useLayoutEffect` error with Radix UI and React 19 in Azure Static Web Apps is likely due to a subtle React version mismatch/duplication or environment difference, not direct library incompatibility.**
-   **CDN caching can be extremely aggressive and may require manual intervention (like adding a unique comment to `index.html`) to force a refresh of the deployed application.**
