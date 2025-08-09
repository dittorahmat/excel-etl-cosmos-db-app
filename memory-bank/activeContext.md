# Active Context

## Current Focus
The primary focus is on resolving a critical deployment issue with the Azure Static Web App. The application works locally but fails in the production environment with a `Uncaught TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')` error.

## Recent Changes
- Investigated the `useLayoutEffect` error and determined it was caused by an incorrect Vite build configuration (`vite.config.ts`) that was not bundling React with its dependencies correctly.
- Modified `vite.config.ts` to remove the `external` and `globals` configuration for React and simplified the `manualChunks` logic to create a single vendor bundle.
- Rebuilt the application and deployed the changes to Azure.
- The error persisted, leading to further investigation.
- Identified that the root `index.html` file, which is intended for development, was likely being served in production.
- Discovered that the `staticwebapp.config.json` file contains multiple `rewrite` rules pointing to `/index.html`, which is likely the cause of the issue.
- Attempted to modify `staticwebapp.config.json` but the operation failed due to multiple occurrences of the search string.

## Problems Faced
- **Incorrect Production Asset Serving:** The Azure Static Web App is serving the development `index.html` from the repository root instead of the production-ready `index.html` from the `dist` directory. This is the main cause of the `useLayoutEffect` error in production.
- **Tooling Issues:** The `replace` tool failed when attempting to update `staticwebapp.config.json` because the target string was not unique. A more specific replacement strategy is needed.
- **Development/Production Mismatch:** The root `index.html` contains development-only script tags (`<script type="module" src="/src/main.tsx"></script>`) which are not suitable for production.

## Next Steps
1.  **Correct `staticwebapp.config.json`:** Use the `replace` tool with the `expected_replacements` parameter to fix all occurrences of the incorrect rewrite path.
2.  **Clean up root `index.html`:** Remove the development-specific script tags from the root `index.html` to prevent it from being used in production.
3.  **Rebuild and Redeploy:** After making the configuration changes, rebuild the application and push the changes to trigger a new deployment.
4.  **Verify Deployment:** Thoroughly test the deployed application to ensure the issue is resolved.
