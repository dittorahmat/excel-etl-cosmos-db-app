# Tech Context

## Technologies

### Frontend
-   **Framework**: React 18
-   **Build Tool**: Vite
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS (v3), Shadcn UI, Lucide React
-   **Auth**: MSAL React (@azure/msal-react)
-   **HTTP Client**: Native `fetch` wrapper (`api.ts`)
-   **Charts**: Recharts

### Backend
-   **Runtime**: Node.js (v18+)
-   **Framework**: Express.js
-   **Language**: TypeScript
-   **Database SDK**: @azure/cosmos
-   **Storage SDK**: @azure/storage-blob
-   **Auth**: MSAL Node, JWT validation

## Development Environment
-   **Package Manager**: `npm` (v9+)
-   **Workspaces**: Enabled (`server` workspace).
-   **Linting**: ESLint
-   **Formatting**: Prettier
-   **Testing**: Vitest (Client & Server configs)

## Technical Constraints & Setup
-   **Environment Variables**: Loaded via `.env`. Frontend variables must start with `VITE_`.
-   **Module System**: Project is configured as ESM (`"type": "module"` in `package.json`).
-   **PostCSS**: Configured using ESM syntax (`export default`) in `postcss.config.js`.
-   **Windows Support**: Scripts should be cross-platform or use PowerShell-compatible syntax where necessary (e.g., setting environment variables).

## Known Configuration details
-   **Node Env**: `NODE_ENV=production` causes `npm install` to skip `devDependencies`. Use `npm install --include=dev` in development environments if this variable is set globally.
-   **Tailwind**: Downgraded to v3 to ensure stability with current PostCSS/Vite configuration.