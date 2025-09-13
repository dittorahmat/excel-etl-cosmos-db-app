export function getServerConfig(env) {
    // Server configuration
    const port = parseInt(env.PORT || '3001', 10);
    const host = env.HOST || 'localhost';
    // Azure Storage configuration
    const storageConnectionString = env.AZURE_STORAGE_CONNECTION_STRING || '';
    const storageAccount = env.AZURE_STORAGE_ACCOUNT || '';
    const storageKey = env.AZURE_STORAGE_KEY || '';
    const storageContainer = env.AZURE_STORAGE_CONTAINER || 'excel-uploads';
    // Azure Cosmos DB configuration
    const cosmosEndpoint = env.AZURE_COSMOSDB_ENDPOINT || env.AZURE_COSMOS_ENDPOINT || '';
    const cosmosKey = env.AZURE_COSMOSDB_KEY || env.AZURE_COSMOS_KEY || '';
    const cosmosDatabase = env.AZURE_COSMOSDB_DATABASE || env.AZURE_COSMOS_DATABASE || 'excel-data';
    const cosmosContainer = env.AZURE_COSMOSDB_CONTAINER || env.AZURE_COSMOS_CONTAINER || 'excel-records';
    const cosmosPartitionKey = env.AZURE_COSMOS_PARTITION_KEY || '/id';
    // CORS configuration
    const corsOrigins = (env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
        .split(',')
        .map(origin => origin.trim());
    // File upload configuration
    const fileSizeLimit = parseInt(env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024; // Convert MB to bytes
    const allowedTypes = (env.ALLOWED_FILE_TYPES || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel')
        .split(',')
        .map(type => type.trim());
    // Logging configuration
    const logLevel = env.LOG_LEVEL || 'info';
    const logFormat = env.LOG_FORMAT || 'json';
    // Security configuration
    const sessionSecret = env.SESSION_SECRET || 'default-session-secret';
    return {
        server: {
            port,
            host,
        },
        azureStorage: {
            connectionString: storageConnectionString,
            account: storageAccount,
            key: storageKey,
            container: storageContainer,
        },
        azureCosmos: {
            endpoint: cosmosEndpoint,
            key: cosmosKey,
            database: cosmosDatabase,
            container: cosmosContainer,
            partitionKey: cosmosPartitionKey,
        },
        cors: {
            origins: corsOrigins,
        },
        fileUpload: {
            sizeLimit: fileSizeLimit,
            allowedTypes: allowedTypes,
        },
        logging: {
            level: logLevel,
            format: logFormat,
        },
        security: {
            sessionSecret,
        },
    };
}
