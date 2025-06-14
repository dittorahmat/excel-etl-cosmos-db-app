# Plan: Provision Azure Resources and Environment Setup

## Notes
- User requested to check and clean up duplicate environment variables in `.env.example`.
- Cleaned up `.env.example` with no duplicates and clear sections.
- Provisioning script (`provision_azure_resources.sh`) fails because comments remain in `.env` and are loaded as environment variables, causing `export: '#' not a valid identifier` errors.
- Attempts to clean `.env` with `grep -v '^#'` did not fully remove inline comments (e.g., `AZURE_LOCATION=indonesiacentral  # e.g., eastus, westus, westeurope`).
- Inline comments have now been removed from `.env` and the provisioning script was re-run.
- Microsoft.Web provider registration was required and is now complete; provisioning script is being re-run.
- Provisioning script updated to use Azure Functions Consumption Plan (serverless); App Service Plan creation removed per project requirements.
- Provisioning script failed: Node.js 18 runtime is end-of-life (as of 2025-04-30); must update to Node.js 22 per Azure Functions requirements.
- Provisioning script now uses Node.js 22 and provisioning is successful.
- Next step: automate Azure AD app registration via CLI if possible.
- Azure AD app registration automation script created and ready to execute.
- Azure AD app registration script executed successfully; environment variables updated in .env.
- Admin consent for API permissions is required (one-time setup). This must be performed manually in the Azure Portal due to insufficient privileges via CLI.
- API scope in .env may need updating to match Function App name. Function App name is not currently present in .env; user must provide or confirm the correct name.
- To grant admin consent, a tenant admin must visit the admin consent endpoint in a browser (see Microsoft docs):
  https://login.microsoftonline.com/{tenant}/v2.0/adminconsent?client_id={client_id}&redirect_uri={redirect_uri}
  Replace `{tenant}` with your tenant ID, `{client_id}` with your Application (client) ID, and `{redirect_uri}` with your app's redirect URI.
- Azure RBAC 'Application Developer' role is not sufficient to grant admin consent; Global Administrator or Privileged Role Administrator is required.
- Step-by-step admin consent guide for tenant admin provided for user to forward.
- User is configuring custom API scope in Azure AD ('Expose an API') and is stuck at this step.
- User has now completed defining and adding the custom API scope in Azure AD; ready to proceed to authentication integration.
- Attempt to add Microsoft Graph API permissions via CLI failed due to parameter issue; switching to test script approach for verification.
- Test script (`test-auth.js`) created to verify Azure AD authentication and API scope configuration.
- Encountered ES module/CommonJS incompatibility error when running test script (`require is not defined in ES module scope`). Next step: update or rewrite test script to use `import` syntax or `.cjs` extension as appropriate for Node.js 22 and project config.
- Test script updated to use ES module imports; authentication URL generated successfully. Next: complete auth flow and verify token acquisition.
- User encountered AADSTS500011 error (resource principal not found) when testing authentication flow; this indicates the Function App/API was not properly exposed or consented in the target tenant, or the Application ID URI/scope is not recognized by Azure AD in the current tenant context. Troubleshooting is required before moving forward.
- User now faces AADSTS9002325 error: Proof Key for Code Exchange (PKCE) is required for cross-origin authorization code redemption. Indicates missing PKCE support in test script or app registration for SPA/native flow.
- Azure Portal screenshot shows Microsoft Graph delegated permissions are correct, but custom API scope for Function App is not visible; may not be properly exposed or consented in Azure AD.
- PKCE error is now resolved (test script supports PKCE and login/redirect works).
- New blocking issue: AADSTS9002327 error ("Tokens issued for the 'Single-Page Application' client-type may only be redeemed via cross-origin requests"). This means SPA tokens cannot be redeemed by the Node.js script; must test authentication flow from frontend/browser context instead. Custom API scope still needs to be verified as exposed/consented.
- SPA flow implemented in test-auth.html; user now encounters a new error after clicking the login button in the browser (see test-auth.html). Troubleshooting this is the current focus.
- After login, user receives AADSTS50011 (redirect URI mismatch) error in the browser. No error is shown in the SPA page or browser console. The redirect URI http://localhost:3000/test-auth.html must be added to the Azure AD App Registration.
- SPA login flow is now successful after adding the correct redirect URI. Next step: integrate Azure AD authentication in the frontend app.
- Azure AD authentication context, config, and UI components have been implemented in the React frontend (TypeScript, MSAL, MUI, React Router, etc.).
- App.tsx and related files updated to use new authentication and layout structure.
- Next: verify frontend authentication, test protected routes, and handle error states. Prepare for backend Azure AD integration.
- Resume and complete dependency installation (npm install) before backend Azure AD integration.

## Task List
- [x] Identify and remove duplicate variables from `.env.example`
- [x] Organize `.env.example` into clear sections
- [x] Copy `.env.example` to `.env`
- [x] Attempt to run `provision_azure_resources.sh` (failed due to comments in `.env`)
- [x] Attempt to clean `.env` with `grep -v '^#'` (inline comments remain)
- [x] Remove all comments (including inline) from `.env`
- [x] Update provisioning script to use Consumption Plan for Azure Function App
- [x] Re-run `provision_azure_resources.sh` and verify success
- [x] Update provisioning script to use Node.js 22 runtime for Azure Functions
- [x] Monitor provisioning, then proceed to app configuration and development
- [x] Automate Azure AD app registration via CLI (if possible)
- [x] Run and verify Azure AD app registration script, update environment variables
- [x] Grant admin consent for Azure AD app permissions (manual step via Azure Portal)
- [x] Forward step-by-step admin consent guide to tenant admin and request completion
- [x] Identify Function App name and update VITE_API_SCOPE in .env to match
- [x] Define and add custom API scope in Azure AD ("Expose an API")
- [x] Verify Azure AD authentication and API scope with test script
- [x] Troubleshoot and resolve AADSTS500011 (resource principal not found) error
- [x] Resolve PKCE error and ensure custom API scope is exposed/consented
- [x] Troubleshoot and resolve AADSTS9002327 (SPA tokens must be redeemed via cross-origin requests) error by testing authentication flow from frontend/browser app and verifying custom API scope exposure/consent
- [x] Troubleshoot and resolve error after login button in browser SPA flow (test-auth.html)
  - [x] Add http://localhost:3000/test-auth.html as a redirect URI in Azure AD App Registration (SPA)
  - [x] Confirm successful login and token acquisition in browser
- [x] Integrate Azure AD authentication in frontend app
  - [x] Implement authentication context and config (MSAL)
  - [x] Add login page, protected route, and navigation components
  - [x] Update app routing and layouts
  - [ ] Verify authentication flow in frontend (manual test)
  - [ ] Test protected routes and error handling
  - [ ] Document environment variables and usage in .env.example
- [ ] Integrate Azure AD authentication in backend app

## Current Goal
- Integrate Azure AD authentication in backend app