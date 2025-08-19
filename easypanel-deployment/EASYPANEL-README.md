# Excel ETL Application - EasyPanel Deployment

This is a deployment package specifically designed for EasyPanel with Nixpacks build process.

## Key Differences from Standard VPS Deployment

1. **Source Code Included**: This package includes TypeScript source code that will be compiled during the build process
2. **Build Process**: EasyPanel will compile the TypeScript code to JavaScript during deployment
3. **Simplified Structure**: Contains only the necessary files for deployment

## Directory Structure

```
easypanel-deployment/
├── backend/           # Backend source code and build configuration
│   ├── src/           # TypeScript source files
│   ├── common/        # Shared types between frontend and backend
│   ├── tsconfig*.json # TypeScript configuration files
│   └── package.json   # Backend dependencies and scripts
├── frontend/          # Pre-built frontend files
├── start-easypanel.sh # Start script for EasyPanel
└── package.json       # Root package configuration
```

## EasyPanel Configuration

In EasyPanel, configure your application with the following settings:

### Install Command
```
npm install
```

### Build Command
```
npm run build
```

### Start Command
```
npm start
```

## Environment Variables

Make sure to set the following environment variables in EasyPanel:

- `PORT` - Port for the application (default: 3001)
- `AZURE_COSMOS_ENDPOINT` - Azure Cosmos DB endpoint
- `AZURE_COSMOS_KEY` - Azure Cosmos DB key
- `AZURE_COSMOS_DATABASE` - Azure Cosmos DB database name
- `AZURE_COSMOS_CONTAINER` - Azure Cosmos DB container name
- `AZURE_COSMOS_PARTITION_KEY` - Azure Cosmos DB partition key
- `AZURE_STORAGE_ACCOUNT` - Azure Storage account name
- `AZURE_STORAGE_KEY` - Azure Storage account key
- `AZURE_STORAGE_CONTAINER` - Azure Storage container name
- `NODE_ENV` - Node environment (production/development)

## How It Works

1. EasyPanel extracts the package
2. Runs `npm install` to install dependencies
3. Runs `npm run build` to compile TypeScript to JavaScript
4. Runs `npm start` to start the application

The start script will:
1. Install all dependencies
2. Build the backend from TypeScript source
3. Start the Node.js server