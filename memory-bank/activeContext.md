# Active Context

## Current Focus
The primary focus is on resolving a critical deployment issue with the Azure Static Web App. The application works locally but fails in the production environment with a `Uncaught TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')` error.

## Recent Changes
- Investigated the `useLayoutEffect` error and determined it was caused by an incorrect Vite build configuration (`vite.config.ts`) that was not bundling React with its dependencies correctly.
- Modified `vite.config.ts` to remove the `external` and `globals` configuration for React and simplified the `manualChunks` logic to create a single vendor bundle.
- Rebuilt the application and deployed the changes to Azure.
- The error persisted, leading to further investigation.
- Identified that the root `index.html` file, which is intended for development, was likely being served in production.
- Discovered that the `staticwebapp.config.json` file contains multiple `rewrite` rules pointing to `index.html`, which is likely the cause of the issue.
- Corrected the `staticwebapp.config.json` file by:
  - Changing all occurrences of `"rewrite": "index.html"` to `"rewrite": "/index.html"`.
  - Removing a duplicate `platform` key.
- Realized that removing the `<script type="module" src="/src/main.tsx"></script>` from the root `index.html` was a mistake, as it is needed for the Vite development server. The script tag has been restored.

## Problems Faced
- **Incorrect Production Asset Serving:** The Azure Static Web App was serving the development `index.html` from the repository root instead of the production-ready `index.html` from the `dist` directory. The corrections to `staticwebapp.config.json` are intended to fix this.

## Next Steps
1.  **Commit and Push:** The changes to `staticwebapp.config.json` and `index.html` need to be committed and pushed to the repository.
2.  **Rebuild and Redeploy:** Pushing the changes will trigger a new deployment on Azure Static Web Apps.
3.  **Verify Deployment:** Thoroughly test the deployed application to ensure the issue is resolved.
