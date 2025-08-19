# Docker Deployment for Excel ETL Application

This directory contains the necessary files to deploy the Excel ETL application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional but recommended)

## Deployment Instructions

1. **Prepare Environment Variables**
   Create a `.env` file with your configuration:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file with your specific settings.

2. **Build and Run with Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

3. **Build and Run with Docker CLI**
   ```bash
   # Build the Docker image
   docker build -t excel-etl-app .
   
   # Run the container
   docker run -d \
     --name excel-etl-app \
     -p 3001:3001 \
     --env-file .env \
     excel-etl-app
   ```

4. **Access the Application**
   Once running, access the application at `http://localhost:3001`

## Environment Variables

The following environment variables can be set in the `.env` file:

- `PORT` - Port for the application (default: 3001)
- `NODE_ENV` - Node environment (default: production)
- `AZURE_COSMOS_ENDPOINT` - Azure Cosmos DB endpoint
- `AZURE_COSMOS_KEY` - Azure Cosmos DB key
- `AZURE_COSMOS_DATABASE` - Azure Cosmos DB database name
- `AZURE_COSMOS_CONTAINER` - Azure Cosmos DB container name
- `AZURE_STORAGE_ACCOUNT` - Azure Storage account name
- `AZURE_STORAGE_KEY` - Azure Storage account key
- `AZURE_STORAGE_CONTAINER` - Azure Storage container name

## Stopping the Application

If using Docker Compose:
```bash
docker-compose down
```

If using Docker CLI:
```bash
docker stop excel-etl-app
docker rm excel-etl-app
```