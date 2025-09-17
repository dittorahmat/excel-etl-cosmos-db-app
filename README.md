# Excel to Cosmos DB Dashboard

A modern React dashboard application for uploading Excel files, visualizing data, and managing Azure Cosmos DB integration. Features Azure AD authentication, real-time data visualization, and a responsive UI built with Shadcn UI components.



## Features

- **Dependency Fixes**: Resolved `ERR_MODULE_NOT_FOUND` for `zod` by moving it to production dependencies.

- **Modern React Dashboard**: Built with Vite, TypeScript, and React 18 for a fast and responsive user experience.
- **Secure Authentication**: Integrates Azure AD OAuth 2.0 with MSAL for robust user authentication and authorization. Supports both interactive (popup) and silent token acquisition.
- **API Key Management**: Provides a dedicated frontend interface for users to securely generate, list, and revoke their API keys. Features include key naming, optional expiration dates, IP restrictions, and usage tracking.
- **API Query Builder**: Features a user-friendly query builder with dynamic field selection and filter controls to retrieve specific data from Cosmos DB, and also generates API URLs for programmatic access.
- **Excel & CSV File Processing**: Enables uploading of Excel (.xlsx, .xls) and CSV files, with backend processing for dynamic schema detection and data extraction.
- **Data Ingestion to Cosmos DB**: Efficiently ingests processed data from Excel/CSV files into Azure Cosmos DB, handling large datasets through batching.
- **Data Visualization**: Provides interactive charts (bar, line, pie) and tables for comprehensive data analysis, powered by Recharts.
- **Dynamic Query Builder**: Features a user-friendly query builder with dynamic field selection and filter controls to retrieve specific data from Cosmos DB.
- **File Management**: Displays a list of uploaded files with their processing status, record counts, and options to download original files or delete records.
- **Responsive Design**: Ensures a consistent and optimized user experience across various devices (desktop, tablet).
- **Type Safety**: Full TypeScript support across both frontend and backend for enhanced code quality and maintainability.
- **Comprehensive Testing**: Includes a robust test suite with Vitest and React Testing Library for thorough unit and integration testing.
- **Centralized Logging & Monitoring**: Implements detailed request logging, API key usage tracking, and health check endpoints for operational visibility.

## 🧪 Testing

This project includes a comprehensive test suite with unit, integration, and end-to-end tests. For detailed information about our testing strategy, see [TESTING.md](TESTING.md).

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Run end-to-end tests
npm run test:e2e
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Azure AD App Registration
- Azure Cosmos DB account
- Azure Storage account

### Environment Variables

Create a `.env` file in the root directory with the following variables (copy from `.env.example`):

```env
# Azure AD Configuration (Frontend)
VITE_AZURE_AD_CLIENT_ID=your-client-id
VITE_AZURE_AD_TENANT_ID=your-tenant-id
VITE_AZURE_AD_REDIRECT_URI=http://localhost:3000
VITE_API_SCOPE=api://your-api-scope

# Backend API URL (Frontend)
VITE_API_URL=http://localhost:3001

# Server Configuration (Backend)
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Azure Storage Configuration (Backend)
AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string
AZURE_STORAGE_CONTAINER=excel-uploads
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account

# Azure Cosmos DB Configuration (Backend)
AZURE_COSMOS_ENDPOINT=your_cosmos_endpoint
AZURE_COSMOS_KEY=your_cosmos_key
AZURE_COSMOS_DATABASE=excel-upload-db
AZURE_COSMOS_CONTAINER=excel-records
AZURE_COSMOS_PARTITION_KEY=/partitionKey

# Azure AD Authentication (Backend)
AUTH_ENABLED=true
AZURE_TENANT_ID=your_tenant-id
AZURE_CLIENT_ID=your_client-id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_AUDIENCE=api://your_client_id

# API Key Configuration (Backend)
API_KEYS_ENABLED=true
API_KEY_DEFAULT_EXPIRATION_DAYS=365
API_KEY_MAX_KEYS_PER_USER=10
API_KEY_RATE_LIMIT=1000
API_KEY_ENABLE_IP_RESTRICTIONS=true
API_KEY_ALLOWED_IPS=127.0.0.1,::1,192.168.1.0/24
API_KEY_LOGGING_ENABLED=true
API_KEY_USAGE_RETENTION_DAYS=90

# Rate Limiting (Backend)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_MESSAGE="Too many requests, please try again later"

# Logging (Backend)
LOG_TO_FILE=true
LOG_FILE_PATH=logs/app.log
LOG_ROTATION_ENABLED=true
LOG_ROTATION_MAX_SIZE=10m
LOG_ROTATION_MAX_FILES=14d
```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/excel-cosmos-dashboard.git
   cd excel-cosmos-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server (both frontend and backend):
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser for the frontend.
5. The backend API will be available at `http://localhost:3001`.

## 🔧 Development

### Available Scripts

- `dev` - Start development server
- `build` - Build for production
- `preview` - Preview production build
- `test` - Run tests
- `test:watch` - Run tests in watch mode
- `test:coverage` - Generate test coverage report
- `lint` - Run ESLint
- `format` - Format code with Prettier

### Tech Stack

- [React 18](https://reactjs.org/) - UI Library
- [TypeScript](https://www.typescriptlang.org/) - Type checking
- [Vite](https://vitejs.dev/) - Build tool
- [Shadcn UI](https://ui.shadcn.com/) - UI Components
- [MSAL React](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react) - Azure AD Authentication
- [Vitest](https://vitest.dev/) - Testing framework
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Component testing

## API Endpoints

### Authentication Endpoints

#### `GET /api/auth/status`

Checks if authentication is enabled on the server.

**Response**:
```json
{
  "authRequired": true, // or false
  "authType": "jwt" // or "none"
}
```

### API Key Management Endpoints

#### `POST /api/keys`

Creates a new API key for the authenticated user.

**Authentication**: Azure AD token required

**Request Body**:
```json
{
  "name": "My New API Key",
  "expiresAt": "2025-12-31T23:59:59Z", // Optional, ISO 8601 format
  "allowedIps": ["192.168.1.1", "10.0.0.0/8"] // Optional, array of IPs or CIDR
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "key": "<GENERATED_API_KEY_VALUE>", // IMPORTANT: This is shown only once
    "id": "key_uuid",
    "name": "My New API Key",
    "createdAt": "2025-07-14T10:00:00Z",
    "expiresAt": "2025-12-31T23:59:59Z",
    "allowedIps": ["192.168.1.1"]
  }
}
```

#### `GET /api/keys`

Lists all API keys for the current user.

**Authentication**: Azure AD token required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "key_uuid",
      "name": "My API Key",
      "isActive": true,
      "createdAt": "2025-07-14T10:00:00Z",
      "expiresAt": "2025-12-31T23:59:59Z",
      "lastUsedAt": "2025-07-14T10:30:00Z",
      "allowedIps": ["192.168.1.1"]
    }
  ]
}
```

#### `DELETE /api/keys/:keyId`

Revokes an API key by setting its `isActive` status to `false`.

**Authentication**: Azure AD token required

**Response**:
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

### Data Ingestion and Query Endpoints

#### `POST /api/v2/query/imports`

Uploads and processes an Excel or CSV file, ingesting its data into Cosmos DB.

**Authentication**: Azure AD token required

**Request Body**: `multipart/form-data` with a file field named `file`.

**Response**:
```json
{
  "success": true,
  "data": {
    "rowCount": 123 // Number of rows processed
  }
}
```

#### `GET /api/v2/query/imports`

Lists all imported files (metadata) with pagination.

**Authentication**: Azure AD token required

**Query Parameters**:

| Parameter | Type   | Description                               |
|-----------|--------|-------------------------------------------|
| `page`    | `number` | Page number (default: 1)                  |
| `pageSize`| `number` | Number of items per page (default: 10)    |
| `status`  | `string` | Filter by import status (e.g., `completed`, `failed`) |

**Response**:
```json
{
  "data": {
    "items": [
      { /* ImportMetadata object */ }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

#### `GET /api/v2/query/imports/:importId/rows`

Queries rows from a specific imported file.

**Authentication**: Azure AD token required

**Query Parameters**: (Similar to `/api/data` v1, but scoped to `importId`)

**Response**:
```json
{
  "items": [ /* Array of data rows */ ],
  "total": 500,
  "page": 1,
  "pageSize": 100
}
```

#### `POST /api/v2/query/rows`

Queries data across all imports with dynamic field selection and filtering.

**Authentication**: Azure AD token required

**Request Body**:
```json
{
  "fields": ["Name", "Email", "Phone"], // Fields to retrieve
  "filters": [ // Optional array of filter conditions
    {
      "field": "Status",
      "operator": "eq",
      "value": "Active"
    }
  ],
  "limit": 100, // Optional, max records to return
  "offset": 0 // Optional, for pagination
}
```

**Response**:
```json
{
  "items": [ /* Array of data rows */ ],
  "total": 1234,
  "hasMore": true
}
```

#### `GET /api/v2/query/imports/:importId/download`

Downloads the original uploaded file.

**Authentication**: Azure AD token required

**Response**: The original file content (e.g., `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` for Excel).

#### `GET /api/fields`

Retrieves a list of all unique field names found across all imported data in Cosmos DB.

**Authentication**: Azure AD token required

**Response**:
```json
{
  "success": true,
  "fields": ["Name", "Email", "Address", "City", "Country"]
}
```

## Logging and Monitoring

### Request Logging

All API requests are logged with details such as method, path, status code, response time, user ID (if authenticated), API key ID (if used), IP address, and user agent.

Logs are stored in the `logs/` directory:
- `combined.log`: All requests.
- `error.log`: Only error responses (4xx and 5xx).

### API Key Usage Tracking

API key usage is tracked in Cosmos DB, recording timestamp, API key ID, user ID, request details, and response metrics. These records have a configurable Time-To-Live (TTL) for automatic expiration.

#### Usage Statistics

Retrieve aggregated usage statistics for an API key:

```http
GET /api/keys/:keyId/usage
```

**Query Parameters**:
- `timeRange`: Time range for statistics (e.g., `24h`, `7d`, `30d`).

**Example Response**:
```json
{
  "totalRequests": 150,
  "successRate": 98.67,
  "avgResponseTime": 45.2,
  "byStatusCode": {
    "200": 148,
    "400": 2
  },
  "byEndpoint": {
    "GET /api/data": 120,
    "POST /api/upload": 30
  },
  "byDay": {
    "2025-06-15": 50,
    "2025-06-16": 100
  }
}
```

#### Recent Activity

Get recent activity for an API key:

```http
GET /api/keys/:keyId/activity
```

**Query Parameters**:
- `limit`: Number of recent activities to return (default: 50, max: 1000).

### Rate Limiting

- All API endpoints are rate limited to 1000 requests per 15 minutes per IP address by default.
- Authentication endpoints have stricter rate limits (100 requests per 15 minutes).
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`: Maximum number of requests allowed in the time window.
  - `X-RateLimit-Remaining`: Remaining number of requests in the current window.
  - `X-RateLimit-Reset`: Timestamp when the rate limit resets (in seconds since epoch).
- When rate limited, the API returns a 429 Too Many Requests response with a `Retry-After` header.
- Additional rate limiting may be applied at the Azure infrastructure level.

### Health Check Endpoint

```http
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-06-15T14:30:00.000Z",
  "services": {
    "cosmosDb": true,
    "storage": true,
    "auth": true
  }
}
```

### Recommended Alerts

1. **Error Rate Alert**: Trigger when error rate exceeds 5% of requests.
2. **High Latency Alert**: Trigger when average response time exceeds 1 second.
3. **API Key Abuse**: Trigger when an API key exceeds 1000 requests per minute.
4. **Failed Authentication**: Alert on multiple failed authentication attempts.

### Log Retention

- Application logs are retained for 30 days.
- API key usage data is retained for 90 days by default (configurable via `API_KEY_USAGE_RETENTION_DAYS`).

## Test Configuration

This project uses Vitest for testing with separate configurations for client and server tests.

### Test Configurations

1. **Client Tests** (`vitest.optimized.config.ts`)
   - Environment: jsdom
   - Setup: Uses `src/setupTests.simple.ts`
   - Runs tests in `src/` directory
   - Optimized for React component testing.

2. **Server Tests** (`vitest.server.config.ts`)
   - Environment: node
   - Runs tests in `server/test/` directory
   - Configured for API and integration testing.
   - Excludes backup test files.

### Running Tests

- Run all tests: `npm test`
- Run server tests: `npm run test:server`
- Run client tests: `npm run test:client`
- Run tests in watch mode: `npm run test:watch`
- Generate coverage: `npm run test:coverage`

### Test Structure

- Server tests are in `server/test/`.
- Client tests are co-located with components in `src/`.
- Test files follow the pattern `*.test.ts` or `*.test.tsx`

## Security

### API Key Best Practices

1. **Never commit API keys to version control**.
2. **Use environment variables** to store API keys in production.
3. **Rotate keys regularly** (every 90 days recommended).
4. **Use IP restrictions** for additional security.
5. **Monitor usage** for suspicious activity.

### Revoking Compromised Keys

If an API key is compromised:
1. Immediately revoke the key using the `/api/keys/:keyId` DELETE endpoint.
2. Generate a new key for the affected service.
3. Update all clients with the new key.
4. Monitor for any suspicious activity.

## Deployment

The application is deployed using Docker Compose with a multi-stage Dockerfile that builds the application in a builder stage and creates a minimal production image with only runtime dependencies.

The current deployment is configured with:
- HTTPS support using Let's Encrypt certificates
- Nginx as a reverse proxy
- Automatic HTTP to HTTPS redirection
- Health checks for monitoring

To deploy the application:

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Check container status
docker-compose ps
```

The application will be accessible at:
- `https://YOUR_DOMAIN` (HTTPS)
- HTTP requests will automatically redirect to HTTPS

For customizing the deployment (domain, certificates, etc.), modify the `docker-compose.yml` file and associated configuration files.

### HTTPS Setup

This application now supports HTTPS out of the box. For setup instructions, please refer to `HTTPS_SETUP.md` which provides comprehensive instructions for:
- Setting up HTTPS with self-signed certificates for IP-based access
- Configuring Let's Encrypt certificates for domain-based access
- Troubleshooting common HTTPS issues

To deploy with HTTPS enabled:
```bash
docker-compose up -d
```

The application will be accessible at:
- `https://YOUR_SERVER_IP` (HTTPS)
- HTTP requests will automatically redirect to HTTPS

## License

MIT