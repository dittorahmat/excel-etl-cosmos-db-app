#!/bin/bash

# Set the logging directory to a writable location in Azure App Service
# HOME is typically /home in Azure App Service
if [ -n "$HOME" ] && [ -d "$HOME" ]; then
    export LOGGING_DIR="$HOME/LogFiles/app"
else
    export LOGGING_DIR="./logs"
fi

# Create the directory if it doesn't exist
if [ ! -d "$LOGGING_DIR" ]; then
    mkdir -p "$LOGGING_DIR"
fi

echo "Starting application with LOGGING_DIR=$LOGGING_DIR"

# Check if required Azure environment variables are set
if [ -z "$AZURE_COSMOSDB_ENDPOINT" ] || [ -z "$AZURE_COSMOSDB_KEY" ]; then
    echo "WARNING: Missing required Azure Cosmos DB environment variables"
    echo "AZURE_COSMOSDB_ENDPOINT: ${AZURE_COSMOSDB_ENDPOINT:-NOT SET}"
    echo "AZURE_COSMOSDB_KEY: ${AZURE_COSMOSDB_KEY:+SET}"
    
    # Check if we have a .env.azure file and source it
    if [ -f ".env.azure" ]; then
        echo "Loading environment variables from .env.azure"
        source .env.azure
    fi
    
    # Check if we have a .env file and source it
    if [ -f ".env" ]; then
        echo "Loading environment variables from .env"
        source .env
    fi
fi

# Check if required Azure environment variables are now set
if [ -z "$AZURE_COSMOSDB_ENDPOINT" ] || [ -z "$AZURE_COSMOSDB_KEY" ]; then
    echo "ERROR: Still missing required Azure Cosmos DB environment variables after loading .env files"
    echo "AZURE_COSMOSDB_ENDPOINT: ${AZURE_COSMOSDB_ENDPOINT:-NOT SET}"
    echo "AZURE_COSMOSDB_KEY: ${AZURE_COSMOSDB_KEY:+SET}"
    exit 1
fi

echo "Azure Cosmos DB environment variables are set"
echo "AZURE_COSMOSDB_ENDPOINT: ${AZURE_COSMOSDB_ENDPOINT}"
echo "AZURE_COSMOSDB_KEY: ${AZURE_COSMOSDB_KEY:+SET}"

# Check if dist/server.js exists
if [ ! -f "dist/server.js" ]; then
    echo "ERROR: dist/server.js not found!"
    echo "Current directory contents:"
    ls -la
    echo "dist directory contents:"
    if [ -d "dist" ]; then
        ls -la dist/
    fi
    exit 1
fi

# Start the application
node --enable-source-maps dist/server.js