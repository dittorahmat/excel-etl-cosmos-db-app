# Architecture - Frontend (Web)

## Executive Summary
The frontend is a modern Single Page Application (SPA) built with React and TypeScript. It serves as the user interface for the Excel ETL pipeline, providing data visualization, complex query building, and file management capabilities.

## Technology Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Routing**: React Router 7
- **Authentication**: Azure MSAL (@azure/msal-react)
- **Charts**: Recharts
- **Icons**: Lucide React

## Core Patterns

### Component Architecture
The application follows a component-based architecture with a clear separation between:
- **Pages**: Top-level route components (Dashboard, Upload, API Keys).
- **Layouts**: Consistent structural wrappers (MainLayout).
- **Domain Components**: Business-specific UI (QueryBuilder, FileUpload).
- **UI Components**: Low-level, reusable Shadcn primitives (Button, Card, Table).

### Authentication Flow
Uses Azure Active Directory via MSAL.
- `AuthWrapper`: Provides auth context to the entire app.
- `ProtectedRoute`: Ensures only authenticated users can access internal pages.
- `useAuth`: Hook for accessing user profile and token acquisition.
- Supports "Dummy Auth" for development environments.

### Data Fetching & State
- **Hooks**: Custom hooks like `useDashboardData` encapsulate complex page logic and state management.
- **API Client**: Centralized `api.ts` utility using Axios for consistent request handling and header injection.
- **Form Handling**: Direct state management for query builders and file uploads.

## Key Modules

### Query Builder
A dynamic UI that allows users to select data sources (files) and build complex filtering logic. It fetches field definitions from the backend and adapts its operators based on the detected data types (Date, Numeric, Text).

### File Upload & Validation
Provides a drag-and-drop interface. It performs client-side validation using `ExcelJS` to ensure uploaded files contain the mandatory columns (`Source`, `Category`, `Sub Category`) before sending them to the backend.

### Data Visualization
Transforms Cosmos DB query results into interactive tables and charts using Recharts, supporting sorting and export to CSV/Excel.
