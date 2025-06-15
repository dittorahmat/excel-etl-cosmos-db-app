# React Dashboard with Shadcn UI – Implementation Plan

## Notes
- Dashboard requirements: file table, Cosmos DB filters, chart visualization.
- Use React (TypeScript) and Shadcn UI components.
- The project is already scaffolded with Vite + React + TypeScript.
- Shadcn UI is initialized (components.json exists), but may need further setup.
- File upload UI (UploadPage + FileUpload) is implemented and uses /api/upload endpoint.
- Azure AD authentication (MSAL) implementation now includes robust token management, refresh logic, and error handling (see AuthProvider updates).
- App is now wrapped with AuthWrapper and route protection is enforced in App.tsx.
- Connect frontend to backend endpoints for data (file list, filters, chart data).
- Reference docs/plan.md and docs/spec.md for functional details.
- DashboardPage.tsx cleaned up and correctly integrates FileListTable, QueryBuilder, and DataChart with backend state management.
- Test environment for React Testing Library and Vitest set up (setupTests.ts, vite.config.ts updated).
- Installed missing test dependencies for React Testing Library and JSDOM.
- Fixed AuthProvider test and test environment (window/MSAL mocking, Vite config).
- Mocked auth config for tests and improved test setup (matchMedia, ResizeObserver, cleanup).
- Encountered `localStorage is not defined` error in test environment; need to address this to proceed with dashboard tests.
- Attempted to mock localStorage/sessionStorage in setupTests, but error persists; further troubleshooting of global storage mocking in Vitest/JSDOM environment required before dashboard tests can pass.
- Created dedicated global test setup file for storage/window mocking and updated Vite config to include it; this should resolve storage mocking issues for frontend tests.

## Task List
- [x] Scaffold React app with TypeScript (Vite or CRA)
- [x] Integrate Shadcn UI and set up dashboard layout
- [x] Implement table to list uploaded files (fetch from backend)
- [x] Add filters for Cosmos DB queries (UI + backend integration)
- [x] Add chart component for visualizing results (connect to backend data)
- [x] Connect all components to backend endpoints
- [x] Implement file upload UI (UploadPage + FileUpload)
- [x] Enhance Azure AD authentication logic (token management, refresh, error handling)
- [x] Test Azure AD authentication integration end-to-end
- [ ] Test dashboard functionality end-to-end (in progress: fixing test env, running tests)
  - [ ] Fix localStorage/sessionStorage mocking so frontend tests pass
- [x] Set up and validate React/Vitest test environment
- [x] Update/fix AuthProvider tests to use correct mocks and structure

## Current Goal
Test dashboard functionality end-to-end
