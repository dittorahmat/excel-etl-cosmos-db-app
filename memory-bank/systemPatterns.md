## System Architecture

The application follows a standard modern web architecture:

-   **Frontend:** A Single-Page Application (SPA) built with React and Vite. It is hosted on Azure Static Web Apps.
-   **Backend:** A Node.js and Express API hosted on Azure App Service.
-   **Database:** Azure Cosmos DB is used for data storage.
-   **Authentication:** Microsoft Entra ID (formerly Azure AD) is used for user authentication, leveraging the MSAL (Microsoft Authentication Library) on both the frontend and backend.

## Main Components and Interactions

The application is designed as an ETL (Extract, Transform, Load) tool for processing Excel files and storing the data in Azure Cosmos DB. Its main components interact as follows:

-   **Frontend (React/Vite SPA):**
    -   Provides the user interface for interacting with the application.
    -   Handles user authentication and authorization using MSAL.
    -   Allows users to upload Excel files.
    -   Displays the status and results of ETL jobs.
    -   Interacts with the Backend API for file uploads, status polling, and data retrieval.

-   **Backend API (Node.js/Express):**
    -   This is the primary backend, implemented as a Node.js and Express application located in the `server/` directory, and hosted on Azure App Service.
    -   Serves as the central processing unit for ETL operations.
    -   Receives uploaded Excel files from the Frontend.
    -   Authenticates and authorizes incoming requests.
    -   Parses, validates, and transforms the data from Excel files.
    -   Manages the insertion/update of processed data into Azure Cosmos DB.
    -   Provides endpoints for the Frontend to poll for ETL job status and retrieve results.
    -   *(Planned/Future):* Will integrate with Azure Blob Storage for temporary file persistence during the ETL process.

-   **Azure Cosmos DB:**
    -   The primary NoSQL database used for storing the structured data extracted and transformed from Excel files.
    -   Accessed directly by the Backend API for data persistence.

-   **Microsoft Entra ID (Azure AD):**
    -   The identity provider responsible for user authentication.
    -   Integrated with both the Frontend (via MSAL.js) and the Backend API (for token validation) to secure access to the application and its resources.

## Key Directories and Files

This section details the purpose and interaction of key directories and files within the project structure.

### Root Directory (`my-app/`)
-   `package.json`: Defines project metadata, scripts for various tasks (build, test, start), and lists project dependencies.
-   `vite.config.ts`: Configuration file for Vite, the frontend build tool. It defines how the React application is built, optimized, and served.
-   `tsconfig.json`: The base TypeScript configuration file for the entire project, defining compiler options and project references.
-   `index.html`: The main HTML entry point for the Single-Page Application (SPA). It loads the necessary JavaScript bundles.
-   `.env.example`: An example file for environment variables, guiding developers on required configurations.
-   `staticwebapp.config.json`: Configuration file for Azure Static Web Apps, defining routing rules, authentication settings, and other deployment-specific configurations.
-   `GEMINI.md`, `memory-bank/`: Documentation and memory storage for the Gemini agent.

### Frontend (`src/`)
This directory contains the source code for the React Single-Page Application.
-   `main.tsx`: The primary entry point for the React application. It initializes the React root and renders the main `App` component.
-   `App.tsx`: The root component of the React application, responsible for defining the main layout, routing, and overall application structure.
-   `index.css`: Contains global CSS styles applied across the entire frontend application.
-   `authConfig.ts`: Configuration settings for Microsoft Authentication Library (MSAL), used for integrating with Azure Active Directory for authentication.
-   `components/`: A directory for reusable UI components (e.g., buttons, input fields, cards, navigation elements) that can be used across different parts of the application.
-   `auth/`: Contains components, hooks, and utilities specifically related to user authentication and authorization, including MSAL integration logic.
-   `hooks/`: Custom React hooks that encapsulate reusable stateful logic or side effects.
-   `pages/`: Top-level components that represent different views or routes within the application (e.g., `UploadPage.tsx` for file uploads, `DashboardPage.tsx` for data visualization).
-   `utils/`: A collection of utility functions and helper modules used throughout the frontend for common tasks.

### Shared/Common (`common/`)
This directory holds code and definitions that are shared between the frontend and backend components to ensure consistency and type safety.
-   `types/`: Contains TypeScript interface and type definitions for data models (e.g., Excel row structures, Cosmos DB document schemas, API request/response payloads). These types are crucial for maintaining data consistency across the entire application.
-   `tsconfig.json`: TypeScript configuration specific to the common types, ensuring they are compiled correctly and can be imported by other parts of the project.

### Primary Backend (Node.js/Express - `server/`)
This directory contains the source code for the main backend application, which is a Node.js and Express API. This is the central component for handling ETL operations.
-   `server.js`: The main entry point for the Node.js/Express server, responsible for setting up the Express application, defining routes, and starting the server.
-   `src/`: Contains the core logic for the backend, including API routes, controllers, services, and data access layers for interacting with Cosmos DB.
-   `test/`: Unit and integration tests for the Node.js/Express backend.
-   `package.json`: Defines dependencies specific to the Node.js/Express server.
-   `tsconfig.server.build.json`: TypeScript configuration for building the Node.js/Express server.

## Data Flow

The data flow illustrates the journey of an Excel file from user upload to structured data in Cosmos DB:

1.  **User Authentication:**
    -   A user accesses the Frontend SPA.
    -   The Frontend initiates an authentication flow with Microsoft Entra ID (Azure AD) using MSAL.js.
    -   Upon successful authentication, the Frontend receives an access token.
2.  **Excel File Upload:**
    -   The authenticated user selects an Excel file through the Frontend UI.
    -   The Frontend sends the Excel file as part of an HTTP POST request to a designated upload endpoint on the **Backend API (Node.js/Express)**. The access token obtained during authentication is included in the request headers for authorization.
3.  **Backend Processing (ETL):**
    -   The **Backend API (Node.js/Express)** receives the uploaded file and validates the access token.
    -   The uploaded Excel file is stored in Azure Blob Storage.
    -   The Backend parses the Excel file content.
    -   The parsed data is then loaded into the appropriate collections within Azure Cosmos DB.
4.  **ETL Job Status and Feedback:**
    -   During and after the ETL process, the Frontend periodically sends requests to the **Backend API (Node.js/Express)** to query the status of the ongoing or completed ETL job.
    -   The **Backend API (Node.js/Express)** responds with the current status, progress, and any relevant messages (e.g., success, errors, warnings).
    -   The Frontend updates its UI to display this feedback to the user.
5.  **Data Retrieval:**
    -   If the application includes functionality to view the processed data, the Frontend would send requests to the **Backend API (Node.js/Express)** to retrieve data from Azure Cosmos DB.
    -   The **Backend API (Node.js/Express)** queries Cosmos DB and returns the requested data to the Frontend for display.

## Key Technical Decisions & Patterns

### Configuration Management

-   **Local Development:** Uses standard `.env` files.
-   **Production Deployment:** Uses GitHub Actions Secrets, which are injected into the build process by the CI/CD pipeline. The application code uses `import.meta.env.VITE_*` to access these variables.
-   **No Runtime Configuration:** The previous, complex system of loading a `config.js` file at runtime has_been removed to simplify the architecture and eliminate a potential point of failure.

### Testing

-   The project uses Vitest for both client-side and server-side unit and integration testing.
-   A key configuration detail for server-side tests is that the `vitest.server.config.ts` should **not** specify a `test.root` directory if the test runner is executed from the actual project root. This ensures that Vitest can correctly resolve its internal dependencies.
