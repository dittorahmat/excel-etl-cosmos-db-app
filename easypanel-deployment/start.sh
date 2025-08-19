#!/bin/bash

# Exit on any error
set -e

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | xargs)
else
    echo "No .env file found, using environment variables from EasyPanel..."
fi

# Check if required environment variables are set
echo "Checking required environment variables..."
REQUIRED_VARS=("VITE_AZURE_CLIENT_ID" "VITE_AZURE_TENANT_ID" "AZURE_COSMOS_ENDPOINT" "AZURE_COSMOS_KEY" "AZURE_STORAGE_ACCOUNT" "AZURE_STORAGE_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "Warning: The following required environment variables are not set:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo "Please set these variables in the EasyPanel environment configuration."
    echo "Continuing anyway as the application might have defaults or mock implementations..."
else
    echo "All required environment variables are set."
fi

# Start the backend server
echo "Starting backend server..."

# Use the correct path for the server.js file
# In the deployment package, it's at backend/dist/src/server.js
# But in EasyPanel, it might be extracted to a different location
# Let's check if the file exists at the expected location
if [ -f "backend/dist/src/server.js" ]; then
    echo "Found server.js at backend/dist/src/server.js"
    node backend/dist/src/server.js
elif [ -f "../backend/dist/src/server.js" ]; then
    echo "Found server.js at ../backend/dist/src/server.js"
    node ../backend/dist/src/server.js
elif [ -f "./backend/dist/src/server.js" ]; then
    echo "Found server.js at ./backend/dist/src/server.js"
    node ./backend/dist/src/server.js
else
    echo "Error: Could not find server.js file"
    echo "Looking for server.js in the following locations:"
    echo "  - backend/dist/src/server.js"
    echo "  - ../backend/dist/src/server.js"  
    echo "  - ./backend/dist/src/server.js"
    echo "Current directory contents:"
    ls -la .
    echo "Backend directory contents:"
    if [ -d "backend" ]; then
        ls -la backend/
    fi
    if [ -d "../backend" ]; then
        ls -la ../backend/
    fi
    if [ -d "./backend" ]; then
        ls -la ./backend/
    fi
    exit 1
fi

echo "Backend server started successfully"
echo "Application is now running!"
echo "Backend API: http://localhost:${PORT:-3001}"
echo "Frontend: http://localhost:${PORT:-3001}"