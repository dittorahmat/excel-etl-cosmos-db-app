# Excel to Cosmos DB ETL Application

A secure, full-stack application for uploading Excel files, processing them, and storing the data in Azure Cosmos DB with a queryable API. Features robust authentication, API key management, and comprehensive monitoring.

## Features

- **Excel File Processing**: Upload and process Excel files with dynamic schema detection
- **Data Querying**: Advanced querying with filtering, sorting, and pagination
- **Dual Authentication**:
  - Azure AD OAuth 2.0 for user authentication
  - API key authentication for server-to-server communication
- **API Key Management**:
  - Generate, revoke, and manage API keys
  - Usage tracking and rate limiting
  - IP-based access restrictions
- **Security**:
  - Rate limiting to prevent abuse
  - Comprehensive request logging
  - Secure key storage with hashing
- **Monitoring**:
  - Request/response logging
  - API key usage analytics
  - Error tracking and alerting
- **Scalable Architecture**: Built on Azure serverless components
- **Type Safety**: Full TypeScript support throughout the codebase

## Authentication

The API supports two authentication methods:

1. **Azure AD Authentication** (Recommended for web applications)
   - Uses OAuth 2.0 with Azure AD
   - Requires a valid Azure AD access token
   - Token should be sent in the `Authorization` header: `Bearer <token>`

2. **API Key Authentication** (For server-to-server communication)
   - Uses API keys for authentication
   - Keys can be passed in the `X-API-Key` header or `api_key` query parameter
   - Each key is associated with a specific user and can be revoked

### Managing API Keys

#### POST /api/keys
Create a new API key.

**Authentication**: Azure AD token required (Bearer token)

**Request Body**:
```json
{
  "name": "My API Key",
  "expiresAt": "2025-12-31T23:59:59.999Z",
  "allowedIps": ["192.168.1.1", "203.0.113.42"],
  "rateLimit": 1000,
  "description": "For internal reporting service"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "key": "generated-api-key-here",
    "id": "key_12345",
    "name": "My API Key",
    "description": "For internal reporting service",
    "createdAt": "2025-06-15T12:00:00.000Z",
    "expiresAt": "2025-12-31T23:59:59.999Z",
    "allowedIps": ["192.168.1.1", "203.0.113.42"],
    "rateLimit": 1000,
    "isActive": true
  }
}
```

> ⚠️ **Important**: The API key is only shown once upon creation. Make sure to store it securely.

#### GET /api/keys/usage/:keyId
Get usage statistics for an API key.

**Authentication**: Azure AD token required

**Response**:
```json
{
  "success": true,
  "data": {
    "keyId": "key_12345",
    "totalRequests": 423,
    "lastUsedAt": "2025-06-15T14:30:00.000Z",
    "usageByEndpoint": [
      {
        "endpoint": "/api/data",
        "count": 400,
        "lastUsed": "2025-06-15T14:30:00.000Z"
      },
      {
        "endpoint": "/api/upload",
        "count": 23,
        "lastUsed": "2025-06-14T09:15:00.000Z"
      }
    ],
    "rateLimit": {
      "limit": 1000,
      "remaining": 577,
      "reset": 1623772800
    }
  }
}
```

#### GET /api/keys
List all API keys for the current user.

**Authentication**: Azure AD token required

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "key_12345",
      "name": "My API Key",
      "createdAt": "2025-06-15T12:00:00.000Z",
      "expiresAt": "2025-12-31T23:59:59.999Z",
      "lastUsedAt": "2025-06-15T14:30:00.000Z",
      "isActive": true
    }
  ]
}
```

#### DELETE /api/keys/:keyId
Revoke an API key.

**Authentication**: Azure AD token required

**Response**:
```json
{
  "success": true,
  "message": "API key revoked successfully"
}
```

## API Endpoints

### Data Query API

#### GET /api/data

Query data from Cosmos DB with flexible filtering.

**Authentication**: Azure AD token or API key required

**Query Parameters**:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| startDate | string | Filter records with date >= startDate (ISO format or YYYY-MM-DD) | `2025-01-01` |
| endDate | string | Filter records with date <= endDate (ISO format or YYYY-MM-DD) | `2025-12-31` |
| category | string | Filter by category (case-insensitive) | `expenses` |
| limit | number | Maximum number of records to return (1-1000, default: 100) | `50` |
| continuationToken | string | Token for pagination (from previous response) | `token123` |
| [field] | string | Filter by any field (exact match, case-insensitive) | `status=active` |

**Example Request**:
```http
GET /api/data?startDate=2025-01-01&category=expenses&limit=10
Authorization: Bearer <your-jwt-token>
```

**Example Response**:
```json
{
  "items": [
    {
      "id": "1",
      "category": "expenses",
      "date": "2025-01-15",
      "amount": 100.5,
      "description": "Office supplies"
    },
    ...
  ],
  "count": 10,
  "continuationToken": "token123"
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- Azure account with Cosmos DB and Storage
- Azure AD app registration

### Environment Variables

Copy `.env.example` to `.env` and update with your configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Azure Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=your_storage_connection_string
AZURE_STORAGE_CONTAINER=excel-uploads
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account

# Azure Cosmos DB Configuration
AZURE_COSMOS_ENDPOINT=your_cosmos_endpoint
AZURE_COSMOS_KEY=your_cosmos_key
AZURE_COSMOS_DATABASE=excel-upload-db
AZURE_COSMOS_CONTAINER=excel-records
AZURE_COSMOS_PARTITION_KEY=/partitionKey

# Azure AD Authentication
AUTH_ENABLED=true
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_AUDIENCE=api://your_client_id

# API Key Configuration
API_KEYS_ENABLED=true
API_KEY_DEFAULT_EXPIRATION_DAYS=365
API_KEY_MAX_KEYS_PER_USER=10
API_KEY_RATE_LIMIT=1000
API_KEY_ENABLE_IP_RESTRICTIONS=true
API_KEY_ALLOWED_IPS=127.0.0.1,::1,192.168.1.0/24
API_KEY_LOGGING_ENABLED=true
API_KEY_USAGE_RETENTION_DAYS=90

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_MESSAGE="Too many requests, please try again later"

# Logging
LOG_TO_FILE=true
LOG_FILE_PATH=logs/app.log
LOG_ROTATION_ENABLED=true
LOG_ROTATION_MAX_SIZE=10m
LOG_ROTATION_MAX_FILES=14d
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   cd server && npm install
   ```

2. Start the development server:
   ```bash
   # In root directory
   npm run dev
   ```

3. The API will be available at `http://localhost:3001`

## Logging and Monitoring

### Request Logging
All API requests are logged with the following details:
- Request method and path
- Response status code
- Response time
- User ID (if authenticated)
- API key ID (if used)
- IP address and user agent

Logs are stored in the following files in the `logs/` directory:
- `combined.log`: All requests
- `error.log`: Only error responses (4xx and 5xx)

### API Key Usage Tracking

API key usage is tracked in Cosmos DB with the following details:
- Timestamp of the request
- API key ID and user ID
- Request method and path
- Response status code
- Response time
- Client IP address and user agent

#### Usage Statistics

You can retrieve usage statistics for an API key:

```http
GET /api/keys/:keyId/usage
```

**Query Parameters**:
- `timeRange`: Time range for statistics (24h, 7d, 30d)

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
- `limit`: Number of recent activities to return (default: 50, max: 1000)

## Rate Limiting

- All API endpoints are rate limited to 1000 requests per 15 minutes per IP address by default
- Authentication endpoints have stricter rate limits (100 requests per 15 minutes)
- Rate limit headers are included in all responses:
  - `X-RateLimit-Limit`: Maximum number of requests allowed in the time window
  - `X-RateLimit-Remaining`: Remaining number of requests in the current window
  - `X-RateLimit-Reset`: Timestamp when the rate limit resets (in seconds since epoch)
- When rate limited, the API returns a 429 Too Many Requests response with a `Retry-After` header
- Additional rate limiting may be applied at the Azure infrastructure level

## Monitoring and Alerts

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

1. **Error Rate Alert**: Trigger when error rate exceeds 5% of requests
2. **High Latency Alert**: Trigger when average response time exceeds 1 second
3. **API Key Abuse**: Trigger when an API key exceeds 1000 requests per minute
4. **Failed Authentication**: Alert on multiple failed authentication attempts

### Log Retention

- Application logs are retained for 30 days
- API key usage data is retained for 90 days by default (configurable via `API_KEY_USAGE_RETENTION_DAYS`)

## Security

### API Key Best Practices

1. **Never commit API keys to version control**
2. **Use environment variables** to store API keys in production
3. **Rotate keys regularly** (every 90 days recommended)
4. **Use IP restrictions** for additional security
5. **Monitor usage** for suspicious activity

### Revoking Compromised Keys

If an API key is compromised:
1. Immediately revoke the key using the `/api/keys/:keyId` DELETE endpoint
2. Generate a new key for the affected service
3. Update all clients with the new key
4. Monitor for any suspicious activity

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run server tests
cd server && npm test
```

## Deployment

### Azure Functions

1. Build the application:
   ```bash
   npm run build
   cd server && npm run build
   ```

2. Deploy to Azure Functions using the Azure CLI or GitHub Actions.

## License

MIT
    ...reactDom.configs.recommended.rules,
  },
})
```
