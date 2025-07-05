# File Upload Guide

This document provides instructions for uploading files to the Excel to Cosmos DB application.

## Supported File Types

- CSV (`.csv`)
- Excel (`.xlsx`, `.xls`, `.xlsm`)

## API Endpoints

### Upload File

**Endpoint**: `POST /api/v2/imports`

**Content-Type**: `multipart/form-data`

**Parameters**:
- `file` (required): The file to upload

**Example using curl**:

```bash
# Upload a CSV file
curl -X POST -F "file=@test-upload.csv;type=text/csv" http://localhost:3001/api/v2/imports

# Upload an Excel file
curl -X POST -F "file=@test-upload.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" http://localhost:3001/api/v2/imports
```

**Successful Response (200 OK)**:
```json
{
  "success": true,
  "message": "File processed successfully",
  "importId": "import_17d0199f-55c2-413a-bc32-4a6d8dce1a6e",
  "fileName": "test-upload.csv",
  "totalRows": 2,
  "validRows": 2,
  "errorRows": 0,
  "errors": []
}
```

### List Imports

**Endpoint**: `GET /api/v2/imports`

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Number of items per page (default: 10)
- `sort` (optional): Sort field with optional direction (e.g., `-createdAt` for descending)

**Example**:
```bash
curl "http://localhost:3001/api/v2/imports?page=1&pageSize=10&sort=-createdAt"
```

### Get Import Details

**Endpoint**: `GET /api/v2/imports/:importId`

**Example**:
```bash
curl "http://localhost:3001/api/v2/imports/import_17d0199f-55c2-413a-bc32-4a6d8dce1a6e"
```

### Get Import Rows

**Endpoint**: `GET /api/v2/imports/:importId/rows`

**Query Parameters**:
- `limit` (optional): Maximum number of rows to return (default: 100)
- `offset` (optional): Number of rows to skip (default: 0)

**Example**:
```bash
curl "http://localhost:3001/api/v2/imports/import_17d0199f-55c2-413a-bc32-4a6d8dce1a6e/rows?limit=10&offset=0"
```

## File Requirements

- Maximum file size: 100MB
- CSV files should use UTF-8 encoding
- The first row should contain column headers
- Empty rows will be skipped

## Error Handling

### Common Errors

#### 400 Bad Request
- Missing file
- Invalid file type
- File is empty

#### 413 Payload Too Large
- File exceeds maximum size limit (100MB)

#### 500 Internal Server Error
- Server error during file processing
- Database connection issues

## Testing

To test the upload functionality, you can use the provided test files:

1. CSV Test File (`test-upload.csv`):
```csv
Name,Age,City
John,30,New York
Jane,25,Los Angeles
```

2. Excel Test File (`test-upload.xlsx`):
   - Create a simple Excel file with the same data as above

## Troubleshooting

### File Type Detection
If you encounter issues with file type detection, try explicitly setting the MIME type in your request:

```bash
# For CSV files
-F "file=@data.csv;type=text/csv"

# For Excel files
-F "file=@data.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
```

### Debugging
Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=* node server.js
```

## Security Considerations

- All file uploads are scanned for viruses
- File contents are validated before processing
- Access to uploaded files is restricted to authorized users
- Temporary files are securely deleted after processing
