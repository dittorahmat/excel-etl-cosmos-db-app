## Current Status

The application is currently in a state where core functionality is not yet fully operational in the Azure environment. We are actively debugging deployment and communication issues between the frontend and backend.

## Recent Changes & Fixes

The primary focus has been on diagnosing and resolving deployment and configuration issues.

1.  **Frontend Deployment:** The GitHub Actions workflow for the frontend is consistently showing successful deployments. However, the `config.js` 404 error and `AADSTS500011` error persist on the user's browser, suggesting a caching issue or a deeper problem with the deployed frontend.
    *   **Action Taken:** Made cosmetic changes to `src/App.tsx` to force redeployments, updated `authConfig.ts` to use `import.meta.env.VITE_API_SCOPE`, and explicitly set `NODE_VERSION: 20.x` in the workflow's `env` block for Oryx.
2.  **Backend Deployment:**
    *   The backend App Service is running, and its build status is reported as successful in the Deployment Center.
    *   Backend logs showed "Connection refused" errors, and "tsc: not found" during deployment, indicating a missing TypeScript compiler.
    *   **Action Taken:** Moved `typescript` from `devDependencies` to `dependencies` in `server/package.json` and pushed the changes to trigger a new backend deployment.

## Problems Faced

-   **Persistent Frontend Caching/Stale Deployment:** Even after successful GitHub Actions deployments, the frontend served by Azure Static Web Apps seems to be a cached/stale version, leading to `config.js` 404 and `AADSTS500011` errors (specifically, `api:/` in the scope, indicating `VITE_API_SCOPE` is not being correctly injected).
-   **Backend Communication Issues:** The frontend is still unable to communicate with the backend, resulting in CORS errors and 503 Service Unavailable responses. This indicates issues with the backend application's runtime or its CORS configuration.
-   **Node.js Version Mismatch (Frontend Build):** The Oryx build process was using Node.js 18.x despite `actions/setup-node@v3` being set to 20.x, causing `EBADENGINE` warnings. This has been addressed by explicitly setting `NODE_VERSION` in the workflow's `env` block.
-   **YAML Workflow Validation:** Encountered an "invalid workflow file" error due to a semantic YAML issue, which required careful manual inspection and correction.

## Key Learnings & Decisions

-   **Frontend Caching:** Azure Static Web Apps deployments can be aggressively cached, leading to stale content being served. Clearing browser cache is a necessary first step for verification.
-   **Backend Port Configuration:** Azure App Service's internal proxy might override specified `PORT` settings, requiring explicit configuration of `WEBSITES_PORT` or matching the observed binding port (e.g., `8181`).
-   **Dependency Management:** Critical build-time dependencies like `typescript` should be explicitly listed in `dependencies` rather than `devDependencies` to ensure their availability during deployment.
-   **Node.js Version in CI/CD:** Explicitly setting the Node.js version in the GitHub Actions workflow (`actions/setup-node`) and in the `env` block for Oryx is crucial to avoid `EBADENGINE` warnings and ensure compatibility with project dependencies.
-   **YAML Syntax vs. Semantics:** `yamllint` only checks basic YAML syntax. Deeper issues related to GitHub Actions workflow structure or logic require careful manual review.

