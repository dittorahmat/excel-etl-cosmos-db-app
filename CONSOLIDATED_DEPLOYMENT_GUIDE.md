# Excel to Cosmos DB Dashboard - Consolidated Deployment Guide

This guide provides comprehensive instructions for deploying the Excel to Cosmos DB Dashboard application using various methods. Based on our experience, we recommend the **Alternative Deployment Method** for EasyPanel as it's the most reliable approach.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Recommended Deployment Method: EasyPanel Alternative](#recommended-deployment-method-easypanel-alternative)
5. [Alternative Methods](#alternative-methods)
   - [Nixpacks-based Deployment](#nixpacks-based-deployment)
   - [Docker Deployment](#docker-deployment)
   - [Azure Static Web Apps Deployment](#azure-static-web-apps-deployment)
6. [Deployment Scripts](#deployment-scripts)
   - [Build Script](#build-script)
   - [Start Script](#start-script)
7. [Troubleshooting](#troubleshooting)
8. [Verification Steps](#verification-steps)

## Deployment Options

This application supports multiple deployment methods:

1. **EasyPanel Deployment** (Recommended) - Uses EasyPanel's built-in package installation features
2. **Nixpacks-based Deployment** (Experimental) - Uses the `nixpacks.toml` configuration file
3. **Docker Deployment** - Uses the provided `Dockerfile`
4. **Azure Static Web Apps Deployment** - Uses `staticwebapp.config.json`

## Prerequisites

Before deploying, ensure you have:

1. An Azure subscription with the required resources provisioned:
   - Azure AD App Registration
   - Azure Cosmos DB account
   - Azure Storage account
2. All environment variables configured as specified below
3. Git repository connected to your deployment platform (if using Git-based deployment)

## Environment Variables

Set the following environment variables in your deployment platform:

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

## Recommended Deployment Method: EasyPanel Alternative

Due to persistent issues with the Nixpacks-based deployment method, we recommend using the Alternative Deployment Method with EasyPanel's built-in package installation features.

### EasyPanel Configuration

In your EasyPanel project settings:

1. **Nix Packages**: `nodejs-18_x`
2. **Install Command**: (leave blank)
3. **Build Command**: `bash build-for-easypanel.sh`
4. **Start Command**: `bash start-for-easypanel.sh`
5. **Environment Variables**: Configure all the environment variables as listed above

### Why This Approach Works

1. **Direct Control**: This approach gives us direct control over the build and start process without relying on Nixpacks' automatic behavior
2. **Verified**: Our custom build and start scripts have been tested and verified to work correctly
3. **Simpler**: It bypasses the complex file copying behavior of Nixpacks and uses EasyPanel's built-in package installation features
4. **More Reliable**: Since we control the entire process, there are fewer points of failure

## Alternative Methods

### Nixpacks-based Deployment

If you want to try the Nixpacks-based deployment, you can try one of these approaches:

#### Option 1: Environment Variable
Set the environment variable `NIXPACKS_SKIP_NPM_INSTALL=1` in EasyPanel.

#### Option 2: Nixpacks Configuration File
Use this configuration in your `nixpacks.toml` file:

```toml
# Nixpacks configuration for Excel to Cosmos DB Dashboard

[phases.setup]
nixPkgs = ["nodejs-18_x"]

[variables]
NODE_ENV = "production"

[phases.install]
cmds = [
    "npm ci --only=production",
    "cd server && npm ci --only=production && cd .."
]

[phases.build]
cmds = [
    "npm run build:client",
    "cd server && npm run build && cd .."
]

[start]
cmd = "bash start-for-easypanel.sh"
```

**Note**: The `nixpacks.toml` configuration uses `cmds` arrays to define the installation and build steps directly, rather than trying to run external scripts. This approach is more reliable with Nixpacks because it doesn't rely on external scripts being available in the Docker build context.

### Docker Deployment

For Docker deployment, use the provided `Dockerfile` which provides a multi-stage build process:

```dockerfile
# Multi-stage Dockerfile for Excel to Cosmos DB Dashboard
# This Dockerfile is used for direct container deployment, not for Nixpacks

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies
RUN npm ci
RUN cd server && npm ci

# Copy source code
COPY . .

# Build frontend and backend
RUN npm run build:client
RUN cd server && npm run build

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl bash

# Copy package files for production dependencies
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies only
RUN npm ci --only=production
RUN cd server && npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# Copy startup scripts
COPY start-for-easypanel.sh ./
COPY build-for-easypanel.sh ./

# Make scripts executable
RUN chmod +x ./start-for-easypanel.sh
RUN chmod +x ./build-for-easypanel.sh

# Install serve globally
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start command
CMD ["bash", "start-for-easypanel.sh"]
```

**Note**: This Dockerfile is designed for direct Docker deployment and is separate from the Nixpacks deployment process. When using Nixpacks, a different Dockerfile is automatically generated based on the `nixpacks.toml` configuration.

### Azure Static Web Apps Deployment

For Azure Static Web Apps deployment, refer to the `staticwebapp.config.json` file which contains the necessary configuration.

## Deployment Scripts

### Build Script (build-for-easypanel.sh)

```bash
#!/bin/bash

# Exit on any error
set -e

echo "=== Building for EasyPanel Git Deployment ==="

# Verify Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed or not in PATH"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist server/dist

# Retry mechanism for npm installs
install_with_retry() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts: $1"
        if eval "$1"; then
            echo "Success on attempt $attempt"
            return 0
        else
            echo "Failed on attempt $attempt"
            if [ $attempt -lt $max_attempts ]; then
                echo "Waiting 5 seconds before retry..."
                sleep 5
            fi
            ((attempt++))
        fi
    done
    
    echo "Failed after $max_attempts attempts"
    return 1
}

# Install dependencies with retry
echo "Installing root dependencies..."
install_with_retry "npm ci --only=production --prefer-online"

# Install server dependencies
echo "Installing server dependencies..."
cd server
install_with_retry "npm ci --only=production --prefer-online"
cd ..

# Check if vite.config.js exists and install missing dependencies
if [ -f "vite.config.js" ]; then
    echo "Checking for missing Vite dependencies..."
    
    # Check for @vitejs/plugin-react
    if ! npm list @vitejs/plugin-react &> /dev/null; then
        echo "Installing missing @vitejs/plugin-react..."
        npm install @vitejs/plugin-react --save-dev
    fi
    
    # Check for other potential missing dependencies
    if ! npm list vite &> /dev/null; then
        echo "Installing missing vite..."
        npm install vite --save-dev
    fi
fi

# Build frontend
echo "Building frontend..."
npm run build:client

# Build backend
echo "Building backend..."
cd server
npm run build
cd ..

echo "Build for EasyPanel Git Deployment completed successfully!"
```

### Start Script (start-for-easypanel.sh)

```bash
#!/bin/bash

# Exit on any error
set -e

echo "=== Starting Application for EasyPanel Git Deployment ==="

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

# Determine the correct paths for backend and frontend
BACKEND_PATH=""
FRONTEND_PATH=""

# Check common locations first
if [ -f "server/dist/server/src/server.js" ]; then
    BACKEND_PATH="server/dist/server/src/server.js"
    FRONTEND_PATH="dist"
elif [ -f "dist/server/dist/server/src/server.js" ]; then
    BACKEND_PATH="dist/server/dist/server/src/server.js"
    FRONTEND_PATH="dist"
elif [ -f "./server/dist/server/src/server.js" ]; then
    BACKEND_PATH="./server/dist/server/src/server.js"
    FRONTEND_PATH="./dist"
fi

# If not found in common locations, try to find them
if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH" ]; then
    echo "Trying to locate backend server file..."
    BACKEND_PATH=$(find_file "*/server/dist/server/src/server.js" 5)
fi

if [ -z "$FRONTEND_PATH" ] || [ ! -d "$FRONTEND_PATH" ]; then
    echo "Trying to locate frontend directory..."
    if [ -d "dist" ]; then
        FRONTEND_PATH="dist"
    elif [ -d "./dist" ]; then
        FRONTEND_PATH="./dist"
    else
        FRONTEND_PATH=$(find_file "*/dist" 5)
    fi
fi

# Verify backend server file exists
if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH" ]; then
    echo "ERROR: Backend server file not found at $BACKEND_PATH"
    echo "Current directory: $(pwd)"
    echo "Searching for server.js files:"
    find . -name "server.js" -type f | grep -v node_modules | head -10
    echo "Directory structure around server/dist:"
    ls -la server/dist/ 2>/dev/null || echo "server/dist/ not found"
    ls -la server/dist/server/src/ 2>/dev/null || echo "server/dist/server/src/ not found"
    exit 1
fi

# Verify frontend directory exists
if [ -z "$FRONTEND_PATH" ] || [ ! -d "$FRONTEND_PATH" ]; then
    echo "ERROR: Frontend directory not found at $FRONTEND_PATH"
    echo "Current directory: $(pwd)"
    echo "Searching for dist directories:"
    find . -name "dist" -type d | grep -v node_modules | head -10
    exit 1
fi

echo "Found backend at: $BACKEND_PATH"
echo "Found frontend at: $FRONTEND_PATH"

# Set logging directory to project LogFiles directory
export LOGGING_DIR="./LogFiles"

# Create LogFiles directory if it doesn't exist
mkdir -p "$LOGGING_DIR"

# Install serve globally if not already installed
if ! command -v serve &> /dev/null; then
    echo "Installing serve globally..."
    npm install -g serve
fi

# Start the backend server in the background
echo "Starting backend server from $BACKEND_PATH..."
node --enable-source-maps "$BACKEND_PATH" &

# Store the backend PID
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend server failed to start"
    exit 1
fi

# Start the frontend static server
echo "Starting frontend static server from $FRONTEND_PATH..."
serve -s "$FRONTEND_PATH" -l 3000 &

# Store the frontend PID
FRONTEND_PID=$!

echo "Application started. Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"

# Keep the script running to keep the container alive
wait $BACKEND_PID $FRONTEND_PID
```

## Troubleshooting

If you encounter issues during deployment:

1. **Dependency Installation Issues**: The build script includes retry mechanisms and uses `--prefer-online` flag
2. **File Not Found Errors**: The start script has improved file discovery with multiple fallback methods
3. **ETXTBSY Errors**: The build script handles file locking issues by using retry mechanisms
4. **Cleanup Issues**: The build script explicitly cleans node_modules before installation
5. **Vite Configuration Issues**: Ensure `@vitejs/plugin-react` is installed in devDependencies
6. **Nixpacks Issues**: Make sure you're using the correct package names. npm typically comes bundled with Node.js, so you usually only need to specify `nodejs-18_x` in the Nix packages.
7. **Package Name Issues**: If you encounter "undefined variable" errors, check that you're using the correct Nix package names. In Nix, the package might be named `nodejs-18_x` rather than `nodejs_18`.
8. **Build Script Issues**: If you're using a custom build script, make sure it's correctly copying files to the expected locations. The Nixpacks-generated Dockerfile expects the `package.json` file to be at the root of the copied files.
9. **Git Tracking Issues**: Make sure all necessary files are being tracked by Git. The `.gitignore` file might be excluding files that are needed for the build process. If you're using a `deploy_output` directory, make sure the necessary files within it are being tracked by Git.
10. **"bash: build-for-easypanel.sh: No such file or directory" Error**: This error occurs when Nixpacks generates a Dockerfile that tries to run the build script but the script isn't available in the Docker build context. To fix this:
    - Ensure the `nixpacks.toml` file properly defines the build steps using the `cmds` array instead of trying to run an external script
    - Make sure all necessary files are tracked by Git and not excluded by `.gitignore`
    - Check that the file permissions are correct (scripts should be executable)
    - As an alternative, try setting the `NIXPACKS_SKIP_NPM_INSTALL=1` environment variable in EasyPanel to bypass Nixpacks' automatic npm install behavior

## Verification Steps

To verify that the deployment will work:

1. Run `bash build-for-easypanel.sh` locally to ensure the build completes successfully
2. Run `bash start-for-easypanel.sh` locally to ensure the application starts correctly
3. Check that both scripts have execute permissions (`chmod +x`)
4. Verify that all required environment variables are set
5. Confirm that the Node.js version matches your development environment

With these configurations, your application should deploy successfully with:
- Proper dependency resolution using the correct Nix package names
- Correct file paths
- Stable build and start processes
- Better error handling and reporting