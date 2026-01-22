# Gemini Context: Excel to Cosmos DB Dashboard

## 1. Project Overview
This project is a full-stack ETL (Extract, Transform, Load) pipeline and dashboard application. It allows users to upload Excel/CSV files, processes the data, and stores it in Azure Cosmos DB. The frontend is a React application providing data visualization, a dynamic query builder, and API key management.

**Key Technologies:**
*   **Frontend:** React 18, Vite, TypeScript, Tailwind CSS (v3), Shadcn UI, MSAL (Azure AD).
*   **Backend:** Node.js, Express, TypeScript, Azure Cosmos DB SDK, Azure Storage SDK.
*   **Infrastructure:** Azure App Service, Azure Static Web Apps, Docker.

## 2. Architecture & Directory Structure
The project uses an NPM Workspaces monorepo structure:

*   **Root (`/`):** Contains the Frontend source code and build configuration.
    *   `src/`: React application source.
    *   `public/`: Static assets and generated `config.js`.
    *   `package.json`: Root package managing frontend dependencies and the `server` workspace.
*   **Backend (`server/`):** A nested workspace containing the Node.js API.
    *   `server/src/`: Backend source code.
    *   `server/package.json`: Backend-specific dependencies.
*   **Memory Bank (`memory-bank/`):** Detailed context for AI agents.

## 3. ✅ Configuration Status
**Status:** Stable and Functional.
*   **Package Management:** Root `package.json` is correctly configured with `workspaces: ["server"]`.
*   **Build Process:** Unified build script (`npm run build`) handles both client and server.
*   **PostCSS:** Configured via `postcss.config.js` using ESM imports to match the project's `"type": "module"` setting.
*   **Authentication:** MSAL-based session management is robust, with fixes for race conditions and transient token refresh failures.
*   **Cleanup:** Verbose debug logs have been removed from production code paths. Junk/temporary script files have been purged from the root.

## 4. Building and Running

### Prerequisites
*   Ensure `NODE_ENV` is **not** set to `production` during installation, or use `npm install --include=dev`.

### Standard Commands
```bash
npm install        # Installs all dependencies and links workspaces
npm run dev        # Starts Client (3000) and Server (3001) concurrently
npm run build      # Performs full production build
npm run start      # Runs the production server (serves frontend from server/dist/public)
```

## 5. Development Conventions
*   **TypeScript:** Strict typing used throughout.
*   **Styling:** Tailwind CSS with Shadcn UI components.
*   **Logging:** Use the centralized logger in the backend; avoid `console.log` in application code.
*   **Testing:** Vitest for both frontend and backend units.

## 6. Active Context
*   **Query Builder:** Fully functional with dynamic field detection, utilizing fields from the selected file while handling special filters (Source, Category, Sub Category, Year) separately.
*   **Field Type Detection:** Automated type detection during ingestion ensures the UI displays appropriate operators (e.g., numeric vs. text) for each field.
*   **Authentication:** Stabilized against race conditions and background token refresh failures.
*   **Excel Parsing:** Functional for single-sheet uploads.
*   **Current Focus:** Project is feature-complete and stable. Monitoring performance and maintaining dependencies.

## 7. Key Files
*   `package.json`: Unified configuration.
*   `server/src/server.ts`: Backend entry point.
*   `src/main.tsx`: Frontend entry point.
*   `vite.config.ts`: Frontend build config.
