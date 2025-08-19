# Backend Deployment Error Analysis

This document outlines the step-by-step analysis and resolution of the backend deployment errors encountered on Azure App Service.

## 1. Initial Problem: `MODULE_NOT_FOUND`

The initial deployment of the backend service to Azure App Service failed. The logs showed a `MODULE_NOT_FOUND` error, indicating that the Node.js application could not find its entry point file. The container would crash and fail to start.

## 2. Investigation & Resolution Steps

### Step 2.1: Deployment Path Correction

*   **Hypothesis:** The deployment workflow was packaging the application into a subdirectory, causing the file paths on the server to be incorrect.
*   **Action:** I modified the `.github/workflows/main_excel-etl-backend-378680.yml` file to change the `package` parameter for the `azure/webapps-deploy` action from `.` to `deployment`.
*   **Result:** This change caused the deployment to fail because the `deployment` directory was not found in the context of the deploy job.

### Step 2.2: Artifact Inspection

*   **Hypothesis:** To resolve the pathing issue, I needed to inspect the exact file structure of the deployment artifact.
*   **Action:** I added a debugging step (`ls -lR`) to the workflow to list the file system contents after the artifact was downloaded.
*   **Result:** The workflow failed again, and I was unable to retrieve the logs due to persistent network errors, which blocked this line of investigation.

### Step 2.3: Zip Deployment

*   **Hypothesis:** A more robust deployment method was to create a zip archive of the application and deploy that, which is a standard practice for App Service.
*   **Action:** I modified the workflow to create a `deployment.zip` file containing the built application and updated the deploy step to use this zip file.
*   **Result:** The deployment itself succeeded, but the `MODULE_NOT_FOUND` error persisted, indicating the problem was not with the deployment mechanism itself.

### Step 2.4: Startup Command Verification

*   **Hypothesis:** The startup command configured on the App Service was incorrect or being misinterpreted.
*   **Action:** I used the Azure CLI (`az webapp config show`) to verify the startup command.
*   **Result:** The command was confirmed to be `npm start`. This created a major contradiction, as the `package.json` specified a `start` script that pointed to `dist/src/server.js`, but the error logs complained about not finding `dist/server.js`.

### Step 2.5: Build Configuration Analysis & Final Fix

*   **Hypothesis:** After several failed attempts to debug the runtime environment, I concluded that the root cause was a subtle inconsistency between the TypeScript build configuration (`tsconfig.build.json`) and the expectations of the Node.js runtime on Azure.
*   **Action 1: Simplification (Incorrect):** I first attempted to simplify the `tsconfig.build.json` by removing the `rootDirs` setting. This was incorrect and led to a build failure because shared files from the `common` directory could no longer be found.
*   **Action 2: Revert & Explicit Startup (Correct):** I reverted the `tsconfig.build.json` and `package.json` files to their original, correct state. The key change was to bypass any potential ambiguity with `npm start` by setting a direct and explicit startup command on the App Service.
*   **Final Startup Command:** `node --enable-source-maps /home/site/wwwroot/dist/src/server.js`

## 3. Conclusion

The final combination of a correct build process (using `rootDirs` in `tsconfig.build.json`) and an explicit, absolute path in the App Service startup command did not resolve the persistent `MODULE_NOT_FOUND` error. The root cause appears to be a deep inconsistency within the Azure App Service runtime environment that I am unable to diagnose with the available tools. The logs do not provide the necessary output for debugging, and the evidence from different log sources is contradictory. Therefore, the issue remains unresolved.
