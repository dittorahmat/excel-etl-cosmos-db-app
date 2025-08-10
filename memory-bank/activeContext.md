# Active Context

## Current Work Focus
The primary focus is on resolving client-side build and runtime errors, and ensuring a stable development environment.

## Recent Changes
-   Resolved Tailwind CSS compilation errors by removing problematic `@apply` directives from `src/index.css`.
-   Applied global `bg-background` and `text-foreground` classes directly to the `<body>` tag in `index.html`.
-   Resolved `Cannot find module` errors by deleting `node_modules` and `package-lock.json` and reinstalling dependencies.
-   Resolved `Uncaught TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')` by identifying and removing the conflicting React 18 CDN script injection (`scripts/add-cdn-scripts.cjs`) which was causing a React version mismatch with the project's React 19.

## Problems Faced
-   Initial Tailwind CSS `@apply` issues with custom colors.
-   Inconsistent `node_modules` leading to module not found errors.
-   React version conflict caused by a post-build script injecting an older React CDN, leading to `useLayoutEffect` errors.

## Next Steps
1.  **Commit and Push:** Commit the resolved changes to the repository.
2.  **Verify Deployment:** Thoroughly test the deployed application to ensure the issues are resolved in the production environment.
3.  **Core ETL Logic:**
    -   Refine Excel parsing logic in the Azure Function to handle various data types and structures.
    -   Implement robust data validation and transformation rules.
    -   Integrate with Azure Blob Storage for temporary file persistence.
    -   Implement Cosmos DB loading with proper error handling and batching.
4.  **Frontend Implementation:**
    -   Develop frontend component for file selection and upload.
    -   Implement status reporting and logging for ETL jobs.
5.  **Security:** Address authentication and authorization for production environment.

## Important Patterns and Preferences
-   Prioritize serverless and managed Azure services.
-   Strong emphasis on TypeScript for type safety.
-   Modular and testable code.
-   Clear separation of concerns between frontend, API, and ETL logic.

## Learnings and Project Insights
-   Careful management of dependencies and build processes is crucial to avoid subtle conflicts, especially with library versions.
-   Azure AD setup for personal accounts (Gmail) in a test environment requires specific considerations and might lead to permission issues, hence authentication is temporarily disabled.
-   Careful planning of Cosmos DB partitioning keys is crucial for performance and cost.
-   Excel parsing can be complex due to varied user inputs; robust validation is key.
