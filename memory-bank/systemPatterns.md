## System Architecture

The application follows a standard modern web architecture:

-   **Frontend:** A Single-Page Application (SPA) built with React and Vite. It is hosted on Azure Static Web Apps.
-   **Backend:** A Node.js and Express API hosted on Azure App Service.
-   **Database:** Azure Cosmos DB is used for data storage.
-   **Authentication:** Microsoft Entra ID (formerly Azure AD) is used for user authentication, leveraging the MSAL (Microsoft Authentication Library) on both the frontend and backend.

## Key Technical Decisions & Patterns

### Frontend Environment Variable Handling (Corrected)

This is a critical pattern for the project. The frontend application, built with Vite, requires access to environment variables (like the Azure AD Client ID) at build time.

-   **The Problem:** The initial CI/CD pipeline attempted to build the application manually and then pass the build artifacts to the Azure deployment action. This failed because the deployment action runs in an isolated environment and did not have access to the secrets.
-   **The Solution:** The corrected pattern involves **not** building the application manually in the workflow. Instead, the secrets are passed directly to the `env` block of the `Azure/static-web-apps-deploy@v1` action. This allows the Azure action to perform the build *itself* with the necessary environment variables correctly injected.

**Correct Workflow Snippet:**

```yaml
- name: Build And Deploy
  id: builddeploy
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_... }}
    repo_token: ${{ secrets.GITHUB_TOKEN }}
    action: "upload"
    app_location: "/"
    output_location: "dist"
  env:
    VITE_AZURE_CLIENT_ID: ${{ secrets.VITE_AZURE_CLIENT_ID }}
    VITE_AZURE_TENANT_ID: ${{ secrets.VITE_AZURE_TENANT_ID }}
    # ... and other variables
```

### Configuration Management

-   **Local Development:** Uses standard `.env` files.
-   **Production Deployment:** Uses GitHub Actions Secrets, which are injected into the build process by the CI/CD pipeline. The application code uses `import.meta.env.VITE_*` to access these variables.
-   **No Runtime Configuration:** The previous, complex system of loading a `config.js` file at runtime has been removed to simplify the architecture and eliminate a potential point of failure.

### Testing

-   The project uses Vitest for both client-side and server-side unit and integration testing.
-   A key configuration detail for server-side tests is that the `vitest.server.config.ts` should **not** specify a `test.root` directory if the test runner is executed from the actual project root. This ensures that Vitest can correctly resolve its internal dependencies.