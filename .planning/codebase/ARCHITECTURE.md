# Project Architecture: Excel to Cosmos DB Dashboard

## Overview
This project is a full-stack application for processing Excel/CSV files and uploading them to Azure Cosmos DB, featuring a dashboard for data visualization and management.

## Tech Stack
- **Frontend:** React with Vite, TypeScript, Tailwind CSS, Radix UI.
- **Backend:** Node.js with Express, TypeScript, Azure Cosmos DB SDK, Azure Storage Blob SDK.
- **Authentication:** Microsoft Authentication Library (MSAL) for React and Node.js.
- **Deployment:** Azure Static Web Apps (ASWA), Docker, Nginx.
- **Database:** Azure Cosmos DB (NoSQL).
- **Storage:** Azure Blob Storage for temporary file storage.

## Architectural Patterns
- **Monorepo-lite:** Uses npm workspaces to manage the root (frontend) and the `server` (backend).
- **Layered Backend Architecture:**
  - **Routes:** API endpoint definitions and request validation.
  - **Services:** Business logic and orchestration.
  - **Repositories:** Data access layer for Cosmos DB and Blob Storage.
  - **Middleware:** Authentication, rate limiting, and error handling.
- **Shared Configuration:** Centralized configuration logic in `config/` that maps environment variables and settings for both client and server.
- **Shared Types:** Type definitions used across the stack located in `common/types/` and `types/`.

## Deployment & CI/CD
- **Azure Static Web Apps:** Optimized for hosting the React frontend and integrated API.
- **Docker:** Support for containerized deployment using `docker-compose`.
- **Nginx:** Configuration available for custom proxy/hosting setups.
- **Scripts:** Extensive set of automation scripts for building, provisioning, and deploying.

## Testing Strategy
- **Unit & Integration Tests:** Vitest for both frontend and backend.
- **End-to-End (E2E) Tests:** Playwright for browser-level testing.
- **Contract Tests:** Verifying API contracts.
- **Mutation Tests:** Measuring test suite effectiveness.
- **Performance Tests:** Assessing system responsiveness.
