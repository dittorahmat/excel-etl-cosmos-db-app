# External Integrations

This document describes all external services and APIs that the Excel to Cosmos DB Dashboard project integrates with.

## Azure Services

### Azure Cosmos DB (NoSQL)
- **Purpose:** Primary database for storing and querying processed records from Excel and CSV files.
- **SDK:** `@azure/cosmos`
- **Integration Points:**
  - `server/src/services/cosmosService.ts` (Handles CRUD operations for records)
  - Records are indexed for efficient searching and filtering.

### Azure Blob Storage
- **Purpose:** Temporary storage for uploaded Excel and CSV files before processing.
- **SDK:** `@azure/storage-blob`
- **Integration Points:**
  - `server/src/services/storageService.ts` (Handles file uploads and retrievals)
  - Files are stored in containers (e.g., `excel-uploads`).

### Azure Active Directory / Entra ID
- **Purpose:** User authentication and authorization (OIDC / OAuth 2.0).
- **Libraries:**
  - `@azure/msal-react` (Frontend authentication)
  - `@azure/msal-node` (Backend authentication/token verification)
  - `jwks-rsa` (Verification of JWT signatures)
- **Integration Points:**
  - `src/auth/` (Frontend auth provider and hooks)
  - `server/src/middleware/auth.ts` (Backend JWT validation middleware)

### Azure Static Web Apps (SWA)
- **Purpose:** Hosting platform for the frontend React application and integrated API management.
- **Configuration:** `staticwebapp.config.json`
- **Integration Points:**
  - Handles routing, authentication redirects, and API proxying.

## Data Processing Integrations

### Excel Processing (ExcelJS)
- **Purpose:** Reading and parsing `.xlsx` and `.xls` files into JSON objects.
- **Integration Points:**
  - `server/src/utils/excelProcessor.ts` (Converts spreadsheet rows into Cosmos DB documents)

### CSV Processing (csv-parser)
- **Purpose:** Streaming and parsing large `.csv` files efficiently.
- **Integration Points:**
  - `server/src/utils/csvProcessor.ts` (Handles various delimiters and character encodings)

## Other Integrations

### Nginx (Internal Deployment)
- **Purpose:** Reverse proxy and SSL termination for Docker-based deployments.
- **Configuration:** `nginx.conf`

### Certbot / Let's Encrypt
- **Purpose:** Automatic SSL certificate renewal for non-Azure-native deployments.
