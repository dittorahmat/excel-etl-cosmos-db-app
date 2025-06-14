# Excel to Cosmos DB ETL Server (TypeScript)

This server provides an API for uploading Excel files, storing them in Azure Blob Storage, and saving the structured data to Azure Cosmos DB. Built with TypeScript, Express, and Azure services.

## 🚀 Features

- **TypeScript**: Strongly-typed codebase for better developer experience and maintainability
- **File Upload**: Upload Excel/CSV files via REST API
- **Azure Integration**:
  - Azure Blob Storage for file storage
  - Azure Cosmos DB for structured data storage
- **Validation**: File type and size validation
- **Error Handling**: Comprehensive error handling and logging
- **Testing**: Unit and integration tests with Vitest
- **Environment Configuration**: Easy configuration via environment variables

## 📋 Prerequisites

- Node.js 18.x or later
- npm 9.x or later, or yarn 1.22.x or later
- Azure account with:
  - Azure Blob Storage account
  - Azure Cosmos DB account (SQL API)
- TypeScript 5.x

## 🛠️ Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

4. **Environment Variables**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Azure Storage Configuration (either connection string or account/key)
   AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string
   # OR
   # AZURE_STORAGE_ACCOUNT=your_storage_account
   # AZURE_STORAGE_KEY=your_storage_key
   
   # Azure Cosmos DB Configuration (either connection string or endpoint/key)
   AZURE_COSMOS_CONNECTION_STRING=your_cosmos_connection_string
   # OR
   # AZURE_COSMOSDB_ENDPOINT=your_cosmos_endpoint
   # AZURE_COSMOSDB_KEY=your_cosmos_key
   # AZURE_COSMOSDB_DATABASE=your_database_name
   
   # Container Names (optional)
   # AZURE_STORAGE_CONTAINER=excel-uploads
   # AZURE_COSMOSDB_CONTAINER=excel-records
   
   # CORS Configuration
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   
   # File Upload Configuration
   FILE_SIZE_LIMIT=10485760  # 10MB in bytes
   ```

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Azure account with:
  - Azure Blob Storage account
  - Azure Cosmos DB account (SQL API)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>/server
   ```

2. **Run the setup script**
   ```bash
   node scripts/setup.js
   ```
   
   This will:
   - Create a `.env` file with your configuration
   - Install all required dependencies
   - Set up the development environment

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   This will:
   - Compile TypeScript on the fly
   - Restart the server on file changes
   - Provide source maps for debugging

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

3. **Using PM2 (recommended for production)**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name "excel-upload-api"
   pm2 save
   pm2 startup
   ```

## 🧪 Testing

Run tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Project Structure

```
src/
├── config/           # Configuration files
├── middleware/        # Express middleware
├── routes/           # API route handlers
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── server.ts         # Main server file
└── test/             # Test files
```

## 🔧 Linting and Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check TypeScript types
tsc --noEmit
```

## 🛡️ Security

- Input validation for all API endpoints
- File type and size restrictions
- Secure headers with Helmet
- Rate limiting for API endpoints
- Environment-based configuration
- No sensitive data in version control

## 📝 API Documentation

### Upload Excel File

```http
POST /api/upload
Content-Type: multipart/form-data
```

**Request Body:**
- `file`: Excel file to upload

**Response (Success 201):**
```json
{
  "success": true,
  "message": "File uploaded and processed successfully",
  "data": {
    "fileId": "uuid",
    "fileName": "example.xlsx",
    "sheetName": "Sheet1",
    "rowCount": 10,
    "columnCount": 5,
    "uploadDate": "2023-01-01T00:00:00.000Z",
    "blobUrl": "https://..."
  }
}
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

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
