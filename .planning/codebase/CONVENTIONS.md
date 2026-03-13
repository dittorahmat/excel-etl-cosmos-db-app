# Project Conventions

## Core Technology Stack
- **Frontend:** React with Vite (TypeScript, Tailwind CSS, Radix UI)
- **Backend:** Node.js with Express (TypeScript)
- **Shared:** `common` directory for shared types and utilities

## Coding Standards
- **Language:** TypeScript (TSX for React components)
- **Linting:** ESLint (extends `eslint:recommended`, `plugin:@typescript-eslint/recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`)
- **Formatting:** Prettier (integrated with ESLint via `eslint-plugin-prettier`)
- **Style:** `eslint-config-prettier` is used to disable conflicting rules

## Naming Conventions
- **Components:** `PascalCase` for component names and filenames (e.g., `Button.tsx`, `DashboardHeader.tsx`)
- **Files/Directories:** `kebab-case` for non-component files and directories (e.g., `use-auth.ts`, `data-utils.ts`, `api-routes/`)
- **Variables/Functions:** `camelCase` for variables, functions, and hook names (e.g., `const userData`, `function fetchData()`, `useLocalStorage`)
- **Constants:** `UPPER_SNAKE_CASE` for global constants and environment variables (e.g., `API_BASE_URL`, `MAX_RETRY_COUNT`)
- **Types/Interfaces:** `PascalCase` (e.g., `interface UserProfile`, `type ApiStatus`)

## Directory Structure
- `/src`: Frontend React application source code
  - `/@/components`: UI components (using `@/` alias for `src/`)
  - `/@/hooks`: Custom React hooks
- `/server/src`: Backend Node.js source code
  - `/routes`: Express route definitions
  - `/services`: Business logic layer
  - `/repositories`: Data access layer (Azure Cosmos DB)
  - `/middleware`: Express middlewares (Auth, Logging, etc.)
- `/common`: Shared code and types
  - `/types`: TypeScript interfaces and types shared between client and server
- `/config`: Centralized configuration management for both client and server

## Component Guidelines
- **UI:** Use Radix UI primitives and Shadcn UI patterns
- **Styling:** Tailwind CSS for all styling (utility-first approach)
- **Icons:** Lucide React for consistent iconography
- **Hooks:** Prefer functional components and hooks over class components
- **Forms:** React-hook-form (if used, else standard controlled/uncontrolled components)

## TypeScript Usage
- **Strict Mode:** Enabled where possible
- **Any Type:** Avoid `any`; use `unknown` or specific types. Warnings are issued for `any` usage.
- **Interfaces vs Types:** Use `interface` for object shapes that might be extended, `type` for unions or simple aliases.

## Git & Workflow
- **Branching:** Use descriptive branch names (e.g., `feature/join-support`, `fix/auth-token-refresh`)
- **Commits:** Clear, concise messages (Atomic commits preferred)
- **Deployment:** Managed via Azure Static Web Apps and custom deployment scripts (`deploy.sh`, `azure-build.sh`)
