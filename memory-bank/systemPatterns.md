# System Architecture & Patterns

## Architecture Overview
The application follows a modern full-stack web architecture using a Monorepo structure managed by NPM Workspaces.

-   **Frontend:** React (Vite) SPA.
    -   Located in: `src/` (Root)
    -   Build Output: `dist/`
    -   Hosting: Served by the Backend (Production) or Vite Dev Server (Development).
-   **Backend:** Node.js (Express) API.
    -   Located in: `server/` (Workspace)
    -   Build Output: `server/dist/`
    -   Hosting: Azure App Service.
-   **Database:** Azure Cosmos DB (NoSQL).
-   **Storage:** Azure Blob Storage (File persistence).
-   **Authentication:** Microsoft Entra ID (MSAL).

## Key Technical Decisions

### Monorepo Structure
-   **Root `package.json`**: Manages frontend dependencies and build scripts. Defines `workspaces: ["server"]`.
-   **Server `package.json`**: Manages backend-specific dependencies.
-   **Shared Code**: `common/` directory (Types/Interfaces) shared via relative imports or workspace linking.

### Build & Deployment
-   **Unified Build**: `npm run build` triggers:
    1.  `npm run build:client` (Vite -> `dist/`)
    2.  `npm run postbuild:client` (Copy `dist/` to `server/dist/public`)
    3.  `npm run build:server` (TSC -> `server/dist/`)
-   **Production Server**: The Express server handles API requests (`/api/*`) and serves static frontend files (`*`) from `public/` folder in its distribution.

### Code Style & Patterns
-   **Strict Typing**: TypeScript used throughout.
-   **Component Library**: Shadcn UI (Radix Primitives + Tailwind CSS).
-   **State Management**: React Hooks (`useState`, `useEffect`, Custom Hooks).
-   **API Communication**: Centralized `api.ts` utility with interceptors for Auth (Bearer Token) and Error Handling.
-   **Logging**: Centralized logger in Backend (`winston`/custom). Minimal/No `console.log` in Frontend production code.

## Data Flow
1.  **Upload**: User uploads file -> Frontend -> Backend (Multer) -> Blob Storage.
2.  **Ingestion**: Backend parses file -> Transforms data -> Cosmos DB (Batch Insert).
3.  **Query**: User builds query -> Frontend -> Backend (Cosmos Query) -> JSON Response.