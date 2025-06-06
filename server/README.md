# Excel to Cosmos DB ETL Server

This server provides an API for uploading Excel files, storing them in Azure Blob Storage, and saving the structured data to Azure Cosmos DB.

## Prerequisites

- Node.js 16.x or later
- Azure account with:
  - Azure Blob Storage account
  - Azure Cosmos DB account
- npm or yarn package manager

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # Azure Storage Configuration
   AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string

   # Azure Cosmos DB Configuration
   AZURE_COSMOS_CONNECTION_STRING=your_cosmos_connection_string

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000

   # File Upload Configuration
   MAX_FILE_SIZE_MB=10
   ALLOWED_FILE_TYPES=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel
   ```

## Running the Server

### Development

```bash
npm run dev:server
```

This will start the server with nodemon for automatic reloading.

### Production

```bash
npm run server
```

## API Endpoints

### Upload Excel File

- **URL**: `POST /api/upload`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Excel file to upload

#### Success Response

```json
{
  "success": true,
  "message": "File uploaded and processed successfully",
  "fileId": "unique-file-id",
  "fileName": "example.xlsx",
  "sheetName": "Sheet1",
  "rowCount": 10,
  "columnCount": 5,
  "uploadDate": "2023-10-05T12:00:00.000Z",
  "blobUrl": "https://yourstorage.blob.core.windows.net/container/filename"
}
```

#### Error Responses

- **400 Bad Request**: Invalid or missing file
- **413 Payload Too Large**: File size exceeds limit
- **500 Internal Server Error**: Server error during processing

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3001 |
| NODE_ENV | Node environment | development |
| AZURE_STORAGE_CONNECTION_STRING | Azure Storage connection string | - |
| AZURE_COSMOS_CONNECTION_STRING | Azure Cosmos DB connection string | - |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |
| MAX_FILE_SIZE_MB | Maximum file size in MB | 10 |
| ALLOWED_FILE_TYPES | Comma-separated list of allowed MIME types | Excel MIME types |

## Error Handling

The server includes comprehensive error handling for:

- Invalid file types
- File size limits
- Azure service connectivity issues
- Data validation errors

All error responses follow the format:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```
