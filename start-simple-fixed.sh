#!/bin/bash

# Simple start script for the application
set -e

echo "Starting Excel to Cosmos DB Dashboard..."

# Set logging directory
export LOGGING_DIR="./LogFiles"
mkdir -p "$LOGGING_DIR"

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

# Start the unified server
echo "Starting server..."
cd /app
NODE_ENV=production node --enable-source-maps "server/dist/server/src/server.js" --port 3000 --prod