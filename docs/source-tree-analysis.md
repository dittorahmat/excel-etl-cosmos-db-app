# Source Tree Analysis

Project: **excel-etl-cosmos-db-app**
Type: Monorepo (NPM Workspaces)

## Project Structure Overview

This project is organized as a monorepo containing a React frontend and a Node.js/Express backend.

```
excel-etl-cosmos-db-app/
├── public/                 # Static assets for frontend
├── scripts/                # Utility scripts for build/config
├── src/                    # Frontend source code (React + Vite)
│   ├── auth/               # MSAL Authentication logic
│   ├── components/         # Reusable UI components
│   │   ├── QueryBuilder/   # Dynamic query construction UI
│   │   ├── upload/         # File upload components
│   │   └── ui/             # Shadcn UI base components
│   ├── hooks/              # Custom React hooks (e.g., useDashboardData)
│   ├── pages/              # Main application pages
│   ├── lib/                # Shared libraries and utilities
│   ├── types/              # TypeScript definitions for frontend
│   └── utils/              # Helper functions (API clients, formatters)
├── server/                 # Backend source code (Node.js + Express)
│   ├── src/
│   │   ├── config/         # Server and service configuration
│   │   ├── middleware/     # Express middleware (Auth, Validation)
│   │   ├── repositories/   # Data access layer
│   │   ├── routes/         # API endpoints
│   │   │   └── v2/         # Versioned API routes
│   │   ├── services/       # Business logic layer
│   │   │   ├── cosmos-db/  # Cosmos DB interaction
│   │   │   ├── ingestion/  # Data processing logic
│   │   │   └── blob-storage/# Azure Blob Storage integration
│   │   ├── types/          # Backend TypeScript definitions
│   │   └── utils/          # Logging and helper utilities
├── common/                 # (Optional) Shared code between parts
├── docs/                   # Project documentation and specifications
└── tests/                  # Integration and E2E tests
```

## Critical Folders & Entry Points

### Frontend (Root)
- **Entry Point**: `src/main.tsx` (ReactDOM initialization) and `src/App.tsx` (Routing and Context Providers).
- **Critical Folder**: `src/components/QueryBuilder/` - Core logic for dynamic data filtering.
- **Critical Folder**: `src/auth/` - Integration with Azure AD via MSAL.

### Backend (`server/`)
- **Entry Point**: `server/src/server.ts` - Express application bootstrap.
- **Critical Folder**: `server/src/routes/` - Defines the API contract.
- **Critical Folder**: `server/src/services/ingestion/` - Logic for extracting data from Excel/CSV and mapping to Cosmos DB.
- **Critical Folder**: `server/src/services/cosmos-db/` - Optimized queries and data persistence.

## Key Configuration Files
- `package.json`: Monorepo and workspace configuration.
- `vite.config.ts`: Frontend build and dev server configuration.
- `server/tsconfig.json`: Backend TypeScript configuration.
- `.env`: Environment variables (Auth, Azure credentials, DB connections).
