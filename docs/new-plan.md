# Dynamic Schema ETL System for Tabular Data

## Overview
This document outlines the plan for processing and storing data from CSV/Excel files into Azure Cosmos DB, with each row stored as a separate document. The system is designed to handle files with any structure without requiring predefined schemas.

## Data Flow

### 1. File Upload & Processing
- Accept CSV/Excel file uploads via API endpoint
- Parse the file to extract headers and rows dynamically
- Preserve all original column names and values
- Generate unique IDs for each row
- Add system metadata (upload details, file info, etc.)

### 2. Data Storage
- **Cosmos DB Container**: `imports`
  - Each row becomes a document with dynamic fields
  - Document structure example:
    ```typescript
    interface ImportDocument {
      // Dynamic fields from the file (example only - actual fields vary)
      [key: string]: any;

      // System metadata
      _id: string;            // System-generated unique ID
      _importId: string;      // Batch ID for this import
      _fileName: string;      // Original filename
      _rowNumber: number;     // Original row number in the file
      _uploadedAt: string;    // ISO timestamp of upload
      _uploadedBy: string;    // User ID who uploaded the file
      _fileId?: string;       // Reference to file in blob storage (if applicable)
    }
    ```
- **Partition Key**: `_importId` (groups all rows from the same file upload)

### 3. API Endpoints

#### `POST /api/imports`
- Accepts CSV/Excel file uploads
- Returns import status and document count
- Example response:
  ```json
  {
    "importId": "imp_abc123",
    "status": "completed",
    "processedRows": 150,
    "successfulRows": 148,
    "failedRows": 2,
    "errors": [
      {"row": 42, "error": "Invalid date format"},
      {"row": 87, "error": "Missing required field: email"}
    ]
  }
  ```

#### `GET /api/query`
- Query across all imported data with dynamic filtering
- Supports:
  - Field-based filtering on any column
  - Logical operators (AND, OR, NOT)
  - Comparison operators (=, !=, >, <, >=, <=, CONTAINS)
  - Pagination
  - Field selection
  - Sorting by any column
- Examples:
  - `GET /api/query?metode_pembayaran=Kartu Kredit`
  - `GET /api/query?total_harga[gt]=1000000&kategori_produk=Elektronik`
  - `GET /api/query?$or[0][status]=Selesai&$or[1][status]=Diproses&_sort=-waktu_transaksi&_limit=50`
  - `GET /api/query?_fields=id_transaksi,total_harga,customer_name&_page=2&_limit=20`

#### `GET /api/imports/:importId/rows`
- Query rows from a specific import
- Same query capabilities as `/api/query` but scoped to one import
- Example: `GET /api/imports/imp_abc123/rows?status=completed&_sort=created_at`

#### `GET /api/imports`
- List all imports with metadata
- Filterable by:
  - Date range (`createdAt[gte]`, `createdAt[lte]`)
  - Status (`status=completed|failed|processing`)
  - File name (`fileName[contains]=sales`)
- Includes summary statistics (row counts, error counts, etc.)

## Implementation Steps

### 1. Core Data Processing
- **File Parser**
  - Support CSV and Excel formats
  - Handle different encodings and delimiters
  - Preserve special characters in headers/values
  - Stream processing for large files

- **Dynamic Schema Handler**
  - Auto-detect column types (string, number, date, boolean)
  - Normalize column names (spaces to underscores, lowercase, etc.)
  - Handle nested structures (JSON columns)

### 2. Storage Layer
- **Cosmos DB Service**
  - Bulk import with batch support
  - Automatic retry on throttling
  - Progress tracking
  - Error handling with detailed reporting

- **Metadata Storage**
  - Track import history
  - Store file metadata
  - Record processing statistics

### 3. API Layer
- **File Upload**
  - Chunked upload support
  - Progress tracking
  - Background processing for large files

- **Query Interface**
  - Dynamic filtering on any field
  - Field selection
  - Sorting and pagination
  - Aggregation support

### 4. Error Handlin
- Row-level error tracking
- Detailed error messages
- Support for partial imports
- Retry mechanism for failed rows

### 5. Monitoring & Logging
- Track import progress
- Log processing metrics
- Alert on failures
- Performance monitoring

## Example Document
```json
{
  // Dynamic fields from the file
  "Transaction ID": "TX001",
  "Transaction Date": "2025-07-01T10:00:00Z",
  "Customer ID": "CUST001",
  "Customer Name": "Andi Susanto",
  "Product ID": "PROD01",
  "Product Name": "Laptop Pro",
  "Category": "Electronics",
  "Quantity": 1,
  "Unit Price": 15000000,
  "Total Price": 15000000,
  "Payment Method": "Credit Card",
  "Status": "Completed",
  "Notes": "Urgent delivery requested",

  // System metadata
  "_id": "row_abc123",
  "_importId": "imp_abc123",
  "_fileName": "sales_report_july_2025.xlsx",
  "_sheetName": "July Data",
  "_rowNumber": 2,
  "_uploadedAt": "2025-07-01T11:00:00Z",
  "_uploadedBy": "user123",
  "_processedAt": "2025-07-01T11:00:05Z"
}
```

## Next Steps
1. Implement the dynamic file parser
2. Set up Cosmos DB with appropriate indexing
3. Create the import API endpoints
4. Build the file upload interface
5. Implement query functionality
6. Add monitoring and error tracking
