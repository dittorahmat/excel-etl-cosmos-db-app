## Current Status

The application is stable and the critical production login issue has been resolved. The frontend and backend are successfully deployed, and authentication is working as expected in the live Azure environment.

The immediate task is complete. The project is in a clean, verified state, ready for the next development task.

## Recent Changes & Fixes

The primary focus of the last session was to diagnose and fix a critical authentication failure in the production environment. The error `Invalid Azure AD Client ID: "your-client-id"` indicated that the frontend was being built with placeholder values instead of the correct production secrets.

The debugging process involved several steps:

1.  **Initial Diagnosis:** Incorrectly assumed the environment variables were not set in the Azure Static Web App configuration. This was proven wrong by the user providing a screenshot.
2.  **Code Inspection:** Analysis of `vite.config.ts` and `authConfig.ts` revealed a complex and redundant configuration system. The application was attempting to load configuration at both build-time (via `import.meta.env`) and run-time (via a custom `config.js` file), which was the source of the confusion.
3.  **CI/CD Pipeline Analysis:** The root cause was discovered in the `.github/workflows/azure-static-web-apps-gray-flower-09b086c00.yml` file. The workflow was building the application manually but then using the `Azure/static-web-apps-deploy@v1` action, which performed its own isolated build *without* access to the necessary secrets. This resulted in a broken build being deployed.
4.  **Test Environment Fix:** A secondary issue was discovered where server-side tests were failing due to an incorrect `root` path in `vitest.server.config.ts`, which prevented Vitest from finding its own modules.

**The following actions were taken to resolve these issues:**

-   **Simplified Configuration:** The entire run-time configuration system (`config.js` and related scripts) was removed.
-   **Refactored Code:** `vite.config.ts` and `src/auth/authConfig.ts` were refactored to rely exclusively on Vite's standard build-time environment variable replacement.
-   **Corrected CI/CD Workflow:** The GitHub Actions workflow was completely rewritten to pass the secrets directly to the `env` of the `Azure/static-web-apps-deploy@v1` action. This is the correct and standard method.
-   **Fixed Tests:** The incorrect `root` setting was removed from `vitest.server.config.ts`, allowing all server-side tests to pass.
-   **Verified Changes:** The entire project was validated by running linting, type-checking, all tests, and a full build before the final changes were committed and pushed.

## Key Learnings & Decisions

-   **Frontend Environment Variables:** All frontend environment variables, especially secrets, must be passed directly to the `env` block of the `Azure/static-web-apps-deploy@v1` action in the CI/CD workflow. Manual builds and `.env` file creation within the workflow are unreliable and should be avoided.
-   **Configuration Simplicity:** The project now uses a single, standard method for handling environment variables in the frontend (`import.meta.env`), which simplifies the build process and makes it easier to maintain.
-   **Vitest Root Configuration:** When using Vitest in a monorepo-like structure, avoid setting the `test.root` configuration property if the tests are being run from the actual project root. This ensures Vitest can correctly resolve its own dependencies.