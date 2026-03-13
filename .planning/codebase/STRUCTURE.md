# Project Structure: Excel to Cosmos DB Dashboard

## Root Directory
- `.github/workflows/`: GitHub Actions CI/CD pipelines.
- `.planning/codebase/`: Architectural and structural documentation.
- `@/`: Component and hook aliases.
- `common/`: Shared code between frontend and backend.
  - `types/`: Shared TypeScript type definitions.
- `config/`: Configuration mapping for different environments and components.
- `contract-tests/`: API contract verification tests.
- `e2e/`: Playwright end-to-end tests.
- `mutation-tests/`: Testing the quality of the test suite.
- `performance-tests/`: Stress and load tests.
- `public/`: Static assets for the React frontend.
- `scripts/`: Build and utility scripts.
- `server/`: Node.js/Express backend workspace.
  - `src/`: Backend source code.
    - `config/`: Server-specific configuration.
    - `middleware/`: Express middleware (auth, validation, etc.).
    - `repositories/`: Data access logic for Cosmos DB and Blobs.
    - `routes/`: API endpoint definitions.
    - `services/`: Core business and orchestration logic.
    - `utils/`: Server-side utility functions.
  - `test/`: Backend unit and integration tests.
- `src/`: React frontend source code (located in the root).
  - `auth/`: MSAL and authentication configuration.
  - `components/`: Reusable UI components (Tailwind + Radix).
  - `hooks/`: Custom React hooks.
  - `lib/`: External library configurations.
  - `pages/`: Main application views/routes.
  - `test/`: Frontend unit and integration tests.
  - `types/`: Frontend-specific TypeScript types.
  - `utils/`: Frontend utility functions.
  - `App.tsx`: Main React component and routing.
  - `main.tsx`: React application entry point.
- `types/`: Global or redundant type definitions for root-level tools.
- `tests/`: General shared tests and utilities.

## Key Configuration Files
- `package.json`: Main workspace and dependency configuration.
- `tsconfig.json`: TypeScript configuration (extended by specialized versions).
- `vite.config.ts`: Vite build and development server configuration.
- `tailwind.config.js`: Tailwind CSS configuration.
- `staticwebapp.config.json`: Azure Static Web Apps configuration.
- `docker-compose.yml`: Multi-container Docker configuration.
- `.env.example`: Template for environment variable configuration.
- `eslint.config.js`: Code linting configuration.
- `vitest.config.ts`: Root test configuration.
