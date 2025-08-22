# Excel to Cosmos DB Dashboard - Docker Deployment Guide for EasyPanel

This guide provides comprehensive instructions for deploying the Excel to Cosmos DB Dashboard application using Docker via EasyPanel. This is the recommended and most reliable deployment method.

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [EasyPanel Docker Deployment](#easypanel-docker-deployment)
   - [EasyPanel Configuration](#easypanel-configuration)
   - [Docker Configuration](#docker-configuration)
5. [Deployment Scripts](#deployment-scripts)
   - [Start Script](#start-script)
6. [Verification Steps](#verification-steps)

## Deployment Overview

This application is deployed using a multi-stage Dockerfile that:
1. Builds the application in a builder stage
2. Creates a minimal production image with only runtime dependencies
3. Uses a custom start script for proper application initialization

## Prerequisites

Before deploying, ensure you have:

1. An EasyPanel account with a project set up
2. An Azure subscription with the required resources provisioned:
   - Azure AD App Registration
   - Azure Cosmos DB account
   - Azure Storage account
3. All environment variables configured as specified below

## Environment Variables

Set the following environment variables in your EasyPanel project:

```env
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
API_KEY_ENABLE_IP_RESTRICTIONS=false
API_KEY_ALLOWED_IPS=127.0.0.1,::1
API_KEY_LOGGING_ENABLED=false
API_KEY_LOG_VALIDATIONS=false
```

## EasyPanel Docker Deployment

### EasyPanel Configuration

In your EasyPanel project settings:

1. **Deployment Method**: Select "Git" or "Upload" (Docker)
2. **Build Type**: Select "Dockerfile"
3. **Dockerfile Path**: Leave as default (should automatically detect `Dockerfile`)
4. **Environment Variables**: Configure all the environment variables as listed above

### Docker Configuration

The application uses the following multi-stage Dockerfile:

```dockerfile
# Multi-stage Dockerfile for Excel to Cosmos DB Dashboard
# This Dockerfile installs all dependencies for building, then cleans up dev dependencies for production

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files for dependency installation
COPY package*.json ./
COPY server/package*.json ./server/
COPY common ./common

# Install all dependencies
RUN npm install && cd server && npm install

# Fix Tailwind CSS version conflict
RUN npm uninstall @tailwindcss/vite
RUN npm install tailwindcss@3.4.3 postcss@8.4.38 autoprefixer@10.4.20 --save-dev

# Copy source code
COPY src ./src
COPY server/src ./server/src
COPY index.html vite.config.ts tsconfig.json tsconfig.node.json ./
COPY server/tsconfig*.json ./server/
COPY common ./common
COPY scripts ./scripts

# Copy configuration files
COPY postcss.config.cjs ./
COPY tailwind.config.js ./

# Build frontend and backend
RUN npm run build

# Production stage
FROM node:18-alpine

# Install system dependencies and create log directory
RUN apk add --no-cache curl bash \
    && mkdir -p /app/LogFiles

# Set working directory
WORKDIR /app

# Copy package files for production dependency installation
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies only
RUN npm ci --only=production && cd server && npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# Copy necessary runtime files and make start script executable
COPY start-for-easypanel.sh /start-for-easypanel.sh
RUN chmod +x /start-for-easypanel.sh

# Copy common directory (referenced in tsconfig)
COPY common ./common

# Expose port for the unified server
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start command using the easypanel start script
ENTRYPOINT ["/start-for-easypanel.sh"]
```

## Deployment Scripts

### Start Script (start-for-easypanel.sh)

The Dockerfile uses the following start script:

```bash
#!/bin/bash

# Exit on any error
set -e

echo "=== Starting Application for EasyPanel Git Deployment ==="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Node.js is available
if ! command_exists node; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

echo "Node.js version: $(node --version)"

# Check if npm is available
if ! command_exists npm; then
    echo "ERROR: npm is not installed or not in PATH"
    exit 1
fi

echo "npm version: $(npm --version)"

# Check if we need to build first (for environments that don't run build step)
if [ ! -d "dist" ] || [ ! -d "server/dist" ]; then
    echo "Build artifacts not found, building application..."
    
    # Clean previous builds
    echo "Cleaning previous builds..."
    rm -rf dist server/dist
    
    # Install root dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing root dependencies..."
        npm ci --only=production --prefer-online || {
            echo "Retrying npm install..."
            sleep 5
            npm ci --only=production --prefer-online
        }
    fi
    
    # Install server dependencies if server/node_modules doesn't exist
    if [ ! -d "server/node_modules" ]; then
        echo "Installing server dependencies..."
        cd server
        npm ci --only=production --prefer-online || {
            echo "Retrying server npm install..."
            sleep 5
            npm ci --only=production --prefer-online
        }
        cd ..
    fi
    
    # Build frontend
    echo "Building frontend..."
    npm run build:client
    
    # Build backend
    echo "Building backend..."
    cd server
    npm run build
    cd ..
    
    echo "Build completed successfully!"
else
    echo "Build artifacts found, skipping build process"
fi

# Set logging directory to project LogFiles directory
export LOGGING_DIR="./LogFiles"

# Create LogFiles directory if it doesn't exist
mkdir -p "$LOGGING_DIR"

# Function to find files with better error handling
find_file() {
    local pattern="$1"
    local max_depth="${2:-5}"
    
    # Try multiple approaches to find the file
    if [ -f "$pattern" ]; then
        echo "$pattern"
        return 0
    fi
    
    # Search in current directory with limited depth
    local result=$(find . -maxdepth $max_depth -path "$pattern" -type f 2>/dev/null | head -n 1)
    if [ -n "$result" ]; then
        echo "$result"
        return 0
    fi
    
    # Search with wildcard pattern
    local dir_pattern=$(dirname "$pattern")
    local file_pattern=$(basename "$pattern")
    result=$(find . -maxdepth $max_depth -path "*$dir_pattern*$file_pattern" -type f 2>/dev/null | head -n 1)
    if [ -n "$result" ]; then
        echo "$result"
        return 0
    fi
    
    return 1
}

# Determine the correct path for backend
BACKEND_PATH=""

# Debug: Show what directories exist
echo "DEBUG: Checking directory structure..."
echo "Current directory: $(pwd)"
echo "Contents of current directory:"
ls -la
echo "Contents of server directory:"
ls -la server/ 2>/dev/null || echo "server/ not found"
echo "Contents of server/dist directory:"
ls -la server/dist/ 2>/dev/null || echo "server/dist/ not found"

# Check common locations first (in order of likelihood)
# First check the expected location based on tsconfig.server.build.json (rootDir: ".")
if [ -f "server/dist/src/server.js" ]; then
    BACKEND_PATH="server/dist/src/server.js"
    echo "Found backend at: $BACKEND_PATH"
# Then check the alternative location based on tsconfig.json (rootDir: "..")
elif [ -f "server/dist/server/src/server.js" ]; then
    BACKEND_PATH="server/dist/server/src/server.js"
    echo "Found backend at: $BACKEND_PATH"
# Check with relative paths
elif [ -f "./server/dist/src/server.js" ]; then
    BACKEND_PATH="./server/dist/src/server.js"
    echo "Found backend at: $BACKEND_PATH"
elif [ -f "./server/dist/server/src/server.js" ]; then
    BACKEND_PATH="./server/dist/server/src/server.js"
    echo "Found backend at: $BACKEND_PATH"
fi

# If not found in common locations, try to find it
if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH" ]; then
    echo "Trying to locate backend server file..."
    BACKEND_PATH=$(find_file "*/server/dist/*/src/server.js" 5)
    echo "Find command result: $BACKEND_PATH"
fi

# Verify backend server file exists
if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH" ]; then
    echo "ERROR: Backend server file not found at $BACKEND_PATH"
    echo "Current directory: $(pwd)"
    echo "Directory structure:"
    find . -type d -name "dist" | head -10
    find . -name "server.js" -type f | grep -v node_modules | head -10
    echo "Contents of server directory:"
    ls -la server/ 2>/dev/null || echo "server/ not found"
    echo "Contents of server/dist directory:"
    ls -la server/dist/ 2>/dev/null || echo "server/dist/ not found"
    echo "Contents of server/dist/src directory:"
    ls -la server/dist/src/ 2>/dev/null || echo "server/dist/src/ not found"
    echo "Contents of server/dist/server/src directory:"
    ls -la server/dist/server/src/ 2>/dev/null || echo "server/dist/server/src/ not found"
    exit 1
fi

echo "Found backend at: $BACKEND_PATH"

# Start the unified server that serves both API and frontend static files
echo "Starting unified server from $BACKEND_PATH..."
node --enable-source-maps "$BACKEND_PATH" --port 3000 --prod &

# Store the server PID
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "ERROR: Server failed to start"
    exit 1
fi

echo "Application started. Server PID: $SERVER_PID"
echo "Application available at http://localhost:3000"
echo "API endpoints available at http://localhost:3000/api/*"

# Keep the script running to keep the container alive
wait $SERVER_PID
```

## Verification Steps

To verify that the deployment will work:

1. Ensure all environment variables are properly set in EasyPanel
2. Verify that the Dockerfile is correctly detected by EasyPanel
3. Check that the start script has execute permissions (handled by Dockerfile)
4. Confirm that the Node.js version in the Dockerfile matches your requirements

With these configurations, your application should deploy successfully with:
- Proper dependency resolution through the multi-stage Docker build
- Correct file paths handled by the start script
- Stable application startup process
- Better error handling and reporting