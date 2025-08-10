# Active Context

## Current Focus
The primary focus is on resolving a critical deployment issue with the Azure Static Web App. The application works locally but fails in the production environment with a `Uncaught TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')` error.

## Recent Changes
- Investigated the `useLayoutEffect` error and determined it was caused by `vendor-radix-ui` loading before `vendor-react`.
- Corrected the `staticwebapp.config.json` file to ensure the production `index.html` from the `dist` directory is served.
- Restored the `<script type="module" src="/src/main.tsx"></script>` in the root `index.html` for local development.
- Attempted various `vite.config.ts` configurations (`manualChunks`, `rollupOptions.input`, `external`, removing `@vitejs/plugin-react`) to control bundling and loading order, but these were consistently ignored by Vite, leading to the same multiple vendor bundles.
- Implemented an automated solution: created `scripts/add-cdn-scripts.cjs` to inject React and ReactDOM CDN script tags into `dist/index.html` after the build, ensuring they load before other bundled scripts.
- Updated `package.json` to run `scripts/add-cdn-scripts.cjs` as part of the `postbuild:client` script.

## Problems Faced
- **Vite Bundling Issues:** Vite's bundling behavior is not respecting `rollupOptions` configurations, leading to multiple React-related vendor bundles being loaded in an incorrect order, causing the `useLayoutEffect` error. This required a workaround by manually injecting CDN scripts.

## Next Steps
1.  **Commit and Push:** The changes to `scripts/add-cdn-scripts.cjs`, `package.json`, and `index.html` need to be committed and pushed to the repository.
2.  **Redeploy and Verify:** Pushing the changes will trigger a new deployment on Azure Static Web Apps.
3.  **Verify Deployment:** Thoroughly test the deployed application to ensure the issue is resolved.
