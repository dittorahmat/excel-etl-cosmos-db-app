## Current State: Still Debugging Deployment Issues

The application is currently in a state where core functionality is not yet fully operational in the Azure environment. We are actively debugging deployment and communication issues between the frontend and backend.

### What Works

-   **Frontend Deployment (GitHub Actions):** The GitHub Actions workflow for the frontend is consistently showing successful deployments.
-   **Backend Deployment (GitHub Actions):** The GitHub Actions workflow for the backend is also showing successful deployments.
-   **Backend App Service Running:** The Azure App Service for the backend is reported as running in the Azure Portal.

### What's Left to Build

-   **Frontend-Backend Communication:** The frontend is still unable to communicate with the backend, indicated by CORS errors and 503 Service Unavailable responses.
-   **Frontend Display:** The frontend is displaying a `config.js` 404 error and an `AADSTS500011` error, suggesting a stale deployment or caching issue.
-   **Backend Application Startup:** Despite successful deployment, the backend application does not appear to be listening on the expected port, leading to "Connection refused" errors.

### Known Issues

-   **Frontend Caching/Stale Deployment:** The `config.js` 404 and `AADSTS500011` errors persist on the frontend, indicating that the latest deployed code is not being served or is being aggressively cached.
-   **Backend Port Binding:** The Node.js application on the backend is not binding to the port expected by the Azure App Service proxy, resulting in "Connection refused" errors.
-   **Backend Build Dependencies:** Previously, `tsc` was not found during backend deployment, which has been addressed by moving `typescript` to `dependencies`.

### Evolution of Decisions

-   **Frontend Configuration:** Initial attempts to use runtime configuration for the frontend were abandoned in favor of build-time environment variable injection via GitHub Actions secrets.
-   **Backend Port:** Identified that Azure App Service might override the `PORT` environment variable, requiring explicit setting of `WEBSITES_PORT` or matching the observed binding port (e.g., `8181`).
-   **Dependency Management:** Emphasized the importance of correctly categorizing and installing dependencies (e.g., moving `typescript` to `dependencies`) to ensure build-time tools are available in the deployment environment.
-   **Node.js Version in CI/CD:** Explicitly setting the Node.js version in the GitHub Actions workflow (`actions/setup-node`) is crucial to avoid `EBADENGINE` warnings and ensure compatibility with project dependencies.
-   **YAML Syntax vs. Semantics:** `yamllint` only checks basic YAML syntax. Deeper issues related to GitHub Actions workflow structure or logic require careful manual review.

