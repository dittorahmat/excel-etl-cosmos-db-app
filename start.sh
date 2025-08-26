#!/bin/bash

# Simple start script for the application
set -e

echo "Starting Excel to Cosmos DB Dashboard..."

# Set logging directory
export LOGGING_DIR="./LogFiles"
mkdir -p "$LOGGING_DIR"

# Check if HTTPS is enabled
if [ "$ENABLE_HTTPS" = "true" ] && [ -f "certs/server.key" ] && [ -f "certs/server.crt" ]; then
    echo "Starting server with HTTPS support..."
    # Find the backend server file
    BACKEND_PATH=""
    if [ -f "server/dist/src/server.js" ]; then
        BACKEND_PATH="server/dist/src/server.js"
    elif [ -f "server/dist/server/src/server.js" ]; then
        BACKEND_PATH="server/dist/server/src/server.js"
    fi

    # Verify backend server file exists
    if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH" ]; then
        echo "ERROR: Backend server file not found"
        exit 1
    fi

    echo "Found backend at: $BACKEND_PATH"
    
    # Start the unified server with HTTPS
    echo "Starting server with HTTPS..."
    node --enable-source-maps "$BACKEND_PATH" --port 3000 --https-port 3001 --https-key certs/server.key --https-cert certs/server.crt --prod
else
    echo "Starting server with HTTP only..."
    # Find the backend server file
    BACKEND_PATH=""
    if [ -f "server/dist/src/server.js" ]; then
        BACKEND_PATH="server/dist/src/server.js"
    elif [ -f "server/dist/server/src/server.js" ]; then
        BACKEND_PATH="server/dist/server/src/server.js"
    fi

    # Verify backend server file exists
    if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH" ]; then
        echo "ERROR: Backend server file not found"
        exit 1
    fi

    echo "Found backend at: $BACKEND_PATH"
    
    # Start the unified server with HTTP only
    echo "Starting server..."
    node --enable-source-maps "$BACKEND_PATH" --port 3000 --prod
fi