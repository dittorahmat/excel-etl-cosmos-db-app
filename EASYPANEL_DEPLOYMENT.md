# Excel to Cosmos DB Dashboard - EasyPanel Deployment

## Deployment Instructions

This application is configured for deployment to EasyPanel using Nixpacks with custom build and start commands.

### Configuration

The deployment is configured through:

1. `nixpacks.toml` - Defines the build process for Nixpacks
2. `build-for-easypanel.sh` - Custom build script
3. `start-for-easypanel.sh` - Custom start script

### Environment Variables

Ensure the following environment variables are set in EasyPanel:

```
# Azure Configuration
AZURE_CLIENT_ID=your-azure-client-id
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_COSMOS_ENDPOINT=your-cosmos-endpoint
AZURE_COSMOS_KEY=your-cosmos-key
AZURE_COSMOS_DATABASE=your-database-name
AZURE_COSMOS_CONTAINER=your-container-name
AZURE_COSMOS_PARTITION_KEY=your-partition-key
AZURE_STORAGE_ACCOUNT=your-storage-account
AZURE_STORAGE_KEY=your-storage-key
AZURE_STORAGE_CONNECTION_STRING=your-storage-connection-string
AZURE_STORAGE_CONTAINER=your-storage-container

# Application Configuration
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-session-secret
CORS_ORIGINS=your-cors-origins
VITE_API_BASE_URL=your-api-base-url
VITE_AUTH_ENABLED=false

# API Key Configuration (if needed)
API_KEYS_ENABLED=true
API_KEY_DEFAULT_EXPIRATION_DAYS=365
API_KEY_MAX_KEYS_PER_USER=10
API_KEY_RATE_LIMIT=1000000
```

### Deployment Process

1. Connect your Git repository to EasyPanel
2. Set the build command to: `bash build-for-easypanel.sh`
3. Set the start command to: `bash start-for-easypanel.sh`
4. Configure the environment variables as listed above
5. Deploy the application

### Troubleshooting

If you encounter issues during deployment:

1. Check that all required environment variables are set
2. Verify that the Node.js version matches your development environment
3. Ensure that the build script has execute permissions
4. Check the EasyPanel logs for specific error messages