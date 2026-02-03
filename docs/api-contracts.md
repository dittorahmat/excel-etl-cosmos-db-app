# API Contracts

This document outlines the primary API endpoints provided by the backend.

## Base URL: `/api`

### 1. Data Querying

#### `GET /data`
Queries processed data from Cosmos DB.

- **Parameters**:
  - `startDate`: (string, ISO) Filter by date >=
  - `endDate`: (string, ISO) Filter by date <=
  - `category`: (string) Filter by exact category
  - `page`: (number) Page number
  - `pageSize`: (number) Items per page
  - `[dynamicField]`: (string) Any field name from the source data can be used as a filter.
- **Response**:
  ```json
  {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
  ```

### 2. File Upload (v2)

#### `POST /v2/upload`
Uploads Excel or CSV files for processing.

- **Content-Type**: `multipart/form-data`
- **Body**:
  - `files`: File blob(s)
  - `uploadedBy`: (JSON string) User metadata
- **Response**:
  ```json
  {
    "success": true,
    "message": "Successfully uploaded...",
    "totalRows": 500,
    "successfulUploads": 1
  }
  ```

### 3. API Key Management

#### `POST /keys`
Creates a new API key for the authenticated user.
- **Body**: `{ "name": "string", "expiresAt": "date" }`

#### `GET /keys`
Lists all active API keys for the user.

#### `DELETE /keys/:keyId`
Revokes an API key.

### 4. Access Control

#### `GET /v2/access-control/check-authorization`
Verifies if the current user has permissions to perform restricted actions (like uploading).
