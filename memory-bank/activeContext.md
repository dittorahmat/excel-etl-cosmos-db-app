# Active Context

## Current Focus
Diagnosing and resolving frontend display issues (blank page, CSS MIME type error, `useLayoutEffect` error). The primary problem is the CSS file (`main.W1Mdea1icss`) not being loaded correctly due to an incorrect MIME type (`application/octet-stream`) when deployed to Azure Static Web Apps, despite working locally.

## Recent Changes
- **Vite Configuration Modifications:**
    - Attempted to force CSS output filenames to have a `.css` extension in `vite.config.ts`'s `build.rollupOptions.output.assetFileNames`.
    - First modification: Added `assetInfo.name?.includes('.css') || assetInfo.name?.endsWith('W1Mdea1icss')` condition to return `assets/[name].css`.
    - Second modification (diagnostic): Forced all CSS assets to be named `assets/main.css` to isolate the issue.

## Problems Faced
- **Persistent `main.W1Mdea1icss` Filename:** Despite multiple attempts to control the CSS output filename via `vite.config.ts`, the built output (even locally) consistently produces `dist/assets/main.W1Mdea1icss`. This indicates that the `assetFileNames` configuration is not effectively controlling the CSS asset's final name, or that the `W1Mdea1icss` string is being introduced at a very early stage of the build process, before Rollup's output options.
- **Unknown Source of `W1Mdea1icss`:** The origin of the `W1Mdea1icss` string remains a mystery. Standard PostCSS configurations (`postcss.config.cjs`) do not suggest its source. It does not appear to be a standard Vite hash.
- **Azure Deployment Discrepancy:** The application works correctly on localhost, but the CSS MIME type error persists when deployed to Azure Static Web Apps, suggesting a potential caching issue on Azure's side or a fundamental difference in how Azure serves these specific assets.
- **`useLayoutEffect` Error:** The `Uncaught TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')` error from `vendor-radix-ui.js` persists. This might be a consequence of the CSS loading failure (if the app doesn't initialize correctly) or a separate bundling/React versioning issue.

## Next Steps
1.  **Deep Dive into Vite Asset Handling:** Investigate how Vite processes CSS assets, particularly if there are any plugins or configurations that might be overriding or interfering with `build.rollupOptions.output.assetFileNames` for CSS files.
2.  **Identify `W1Mdea1icss` Origin:** Attempt to pinpoint the exact source of the `W1Mdea1icss` string in the build pipeline. This might involve debugging Vite's build process or searching for this string in other configuration files or dependencies.
3.  **Address `useLayoutEffect` Error:** Once the CSS loading issue is resolved, re-evaluate the `useLayoutEffect` error. If it persists, investigate React/Radix UI bundling and versioning more deeply.
4.  **Azure Cache Invalidation:** If the local build is confirmed to be correct, explore methods to force Azure Static Web Apps to invalidate its cache and serve the latest deployment.