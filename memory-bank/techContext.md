# Tech Context

This file describes the technologies used, the development setup, technical constraints, dependencies, and tool usage patterns.

## Dependencies

### Frontend

*   **React**: A JavaScript library for building user interfaces.
*   **Vite**: A fast build tool for modern web projects.
*   **Vitest**: A fast unit test framework powered by Vite.
*   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
*   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.
*   **Radix UI**: A collection of unstyled, accessible UI components.
*   **shadcn/ui**: A collection of re-usable components built using Radix UI and Tailwind CSS.
*   **MSAL React**: Microsoft Authentication Library for React.

### Backend

*   **Node.js**: A JavaScript runtime built on Chrome's V8 JavaScript engine.
*   **Express**: A fast, unopinionated, minimalist web framework for Node.js.
*   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
*   **Vitest**: A fast unit test framework powered by Vite.
*   **Azure Cosmos DB**: A fully managed NoSQL database for modern app development.
*   **Azure Storage Blob**: A service for storing large amounts of unstructured data.
*   **MSAL Node**: Microsoft Authentication Library for Node.js.

## Development Setup

*   The project is a monorepo with a `server` and a `src` directory for the backend and frontend, respectively.
*   The frontend is built with Vite and the backend is built with `tsc`.
*   The project uses `npm` for package management.
*   The project uses `eslint` for linting and `prettier` for formatting.
*   The project uses `vitest` for testing.
