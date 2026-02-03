# Architecture - Backend

## Executive Summary
The backend is a Node.js Express API that handles data ingestion, complex querying, and security. It acts as the bridge between the frontend and Azure cloud services (Cosmos DB and Blob Storage).

## Technology Stack
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Azure Cosmos DB (NoSQL)
- **Storage**: Azure Blob Storage
- **Authentication**: JWT validation with Azure AD (Microsoft Identity Platform)
- **Logging**: Winston

## Core Components

### 1. API Layer (Routes)
- **Data Route**: Provides dynamic querying of Cosmos DB documents with support for filtering, pagination, and sorting.
- **Upload Route**: Multi-part form handling for Excel/CSV ingestion.
- **API Key Route**: Management of persistent API keys for programmatic access.
- **Access Control**: Validation of user permissions before sensitive operations.

### 2. Service Layer
- **Ingestion Service**: The core ETL logic. It parses files (via `exceljs` and `csv-parser`), detects data types, and prepares documents for Cosmos DB.
- **Cosmos DB Service**: Encapsulates SDK calls, handling container initialization and query execution.
- **Blob Storage Service**: Manages the persistence of raw uploaded files for audit and reprocessing.

### 3. Data Architecture (Cosmos DB)
- Uses a NoSQL approach where each row from an Excel/CSV file is stored as an individual document.
- **System Fields**: `id`, `partitionKey`, `uploadedAt`, `uploadedBy`, `fileName`.
- **Dynamic Fields**: All other columns from the source file are stored as attributes of the document.
- **Partitioning**: Optimized by `partitionKey` (often mapped to `Category` or `Source`) for scalable queries.

## Data Ingestion Pipeline
1. **Reception**: Multer middleware receives file(s).
2. **Validation**: Check file format and basic structure.
3. **Parsing**: Stream-based parsing for large CSV/Excel files.
4. **Transformation**: Mapping row data to the internal JSON schema, including date and number normalization.
5. **Load**: Batch insertion into Cosmos DB and archival to Blob Storage.

## Security
- **Identity**: Token-based authentication using Azure AD.
- **Rate Limiting**: Protects endpoints from abuse using `express-rate-limit`.
- **Validation**: Strict request validation using `express-validator` and `zod`.
