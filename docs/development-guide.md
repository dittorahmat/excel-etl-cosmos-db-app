# Development Guide

## Prerequisites
- **Node.js**: v18 or higher.
- **Azure Account**: Access to Cosmos DB and Blob Storage.
- **Environment Variables**: A `.env` file in the root and/or `server/` directory.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Environment**:
   Copy `.env.example` to `.env` and fill in the Azure credentials and MSAL configuration.

3. **Run in Development Mode**:
   This starts both the React frontend (port 3000) and the Express backend (port 3001) concurrently.
   ```bash
   npm run dev
   ```

## Key Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start both client and server with hot reload. |
| `npm run build` | Build both client and server for production. |
| `npm run start` | Run the production server (serves frontend from `server/dist/public`). |
| `npm run test` | Run all unit tests (Vitest). |
| `npm run test:e2e` | Run end-to-end tests (Playwright). |
| `npm run lint` | Run ESLint across the codebase. |

## Development Patterns

### Adding a New API Endpoint
1. Define the route in `server/src/routes/`.
2. Implement business logic in `server/src/services/`.
3. Register the route in `server/src/config/server.ts` or `server/src/routes/index.ts`.

### Modifying the Ingestion Logic
The main logic resides in `server/src/services/ingestion/ingestion.service.ts`. Use the tests in `server/src/__tests__/` to verify changes.

### Authentication Toggle
In development, you can disable Azure AD auth by setting `VITE_AUTH_ENABLED=false` and `AUTH_ENABLED=false` in your `.env`. This enables "Mock User" mode.
