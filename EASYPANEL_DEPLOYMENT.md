# Excel to Cosmos DB Dashboard - EasyPanel Deployment Guide

This guide provides comprehensive instructions for deploying the Excel to Cosmos DB Dashboard application to EasyPanel, including both the Nixpacks-based approach and an alternative method using EasyPanel's built-in package installation features.

## Prerequisites

Before deploying to EasyPanel, ensure you have:
1. An Azure subscription with the required resources provisioned
2. Environment variables configured as specified below
3. Git repository connected to EasyPanel

## Deployment Methods

This guide covers two deployment methods:

1. **Nixpacks-based deployment** (Primary Method) - Uses the `nixpacks.toml` configuration file
2. **Alternative deployment** (Fallback Method) - Uses EasyPanel's built-in package installation features

## Deployment Configuration

### Environment Variables

Set the following environment variables in your EasyPanel application settings:

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
API_KEY_ENABLE_IP_RESTRICTIONS=false
API_KEY_ALLOWED_IPS=127.0.0.1,::1
API_KEY_LOGGING_ENABLED=false
API_KEY_LOG_VALIDATIONS=false
```

Note: When entering packages in EasyPanel's Nix Packages field, use `nodejs-18_x` as npm typically comes bundled with Node.js.

### Build and Start Commands

Configure the following commands in your EasyPanel application settings:

- **Build Command**: `bash build-for-easypanel.sh`
- **Start Command**: `bash start-for-easypanel.sh`

## Deployment Scripts

### Build Script (build-for-easypanel.sh)

This script handles building the application with enhanced error handling and retry mechanisms:

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

This script handles starting the application with improved file discovery and error reporting:

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
    result=$(find . -maxdepth $max_depth -path "*/$dir_pattern*/$file_pattern" -type f 2>/dev/null | head -n 1)
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

## Nixpacks Configuration (Primary Method)

The application uses a `nixpacks.toml` file to configure the build environment. This is the primary deployment method:

```toml
# Nixpacks configuration for Excel to Cosmos DB Dashboard

# Setup phase - ensure we have the right environment
[phases.setup]
nixPkgs = [
    "nodejs-18_x"
]

# Setup environment variables
[variables]
NODE_ENV = "production"
NPM_CONFIG_PRODUCTION = "false"

# Install phase - install dependencies for both frontend and backend
[phases.install]
cmds = [
    "echo 'Checking Node.js and npm availability...'",
    "which node && node --version",
    "which npm && npm --version",
    # Clean any existing modules to prevent conflicts
    "rm -rf node_modules server/node_modules",
    # Install root dependencies
    "npm ci --only=production --prefer-online",
    # Install missing Vite dependencies that might be needed for build
    "npm install @vitejs/plugin-react vite --save-dev",
    # Install server dependencies
    "cd server && npm ci --only=production --prefer-online && cd .."
]

# Build phase - build both frontend and backend
[phases.build]
cmds = [
    # Build frontend
    "npm run build:client",
    # Build backend
    "cd server && npm run build && cd .."
]

# Start command for the application
[start]
cmd = "bash start-for-easypanel.sh"
```

Note: npm typically comes bundled with Node.js, so we only need to specify `nodejs-18_x` in the Nix packages. The `nodejs-18_x` package in Nix includes both Node.js and npm.

## Alternative Deployment Method (Fallback)

If you encounter issues with the Nixpacks-based deployment, you can use EasyPanel's built-in package installation features:

### 1. Install Node.js and npm through EasyPanel

In your EasyPanel project settings:

1. Navigate to the "Packages" section
2. In the "Nix Packages" field, add:
   ```
   nodejs-18_x
   ```
3. Save the settings

Note: npm typically comes bundled with Node.js, so you usually don't need to install it separately.

Note: npm typically comes bundled with Node.js, so you usually don't need to install it separately.

## Deployment Process

1. Connect your Git repository to EasyPanel
2. If using the alternative method, install Node.js and npm through EasyPanel's package installation features
3. Set the build command to: `bash build-for-easypanel.sh`
4. Set the start command to: `bash start-for-easypanel.sh`
5. Configure the environment variables as listed above
6. Deploy the application

## Troubleshooting

If you encounter issues during deployment:

1. **Dependency Installation Issues**: The build script includes retry mechanisms and uses `--prefer-online` flag
2. **File Not Found Errors**: The start script has improved file discovery with multiple fallback methods
3. **ETXTBSY Errors**: The build script handles file locking issues by using retry mechanisms
4. **Cleanup Issues**: The build script explicitly cleans node_modules before installation
5. **Vite Configuration Issues**: Ensure `@vitejs/plugin-react` is installed in devDependencies
6. **Nixpacks Issues**: Make sure you're using the correct package names. npm typically comes bundled with Node.js, so you usually only need to specify `nodejs-18_x` in the Nix packages.
7. **Package Name Issues**: If you encounter "undefined variable" errors, check that you're using the correct Nix package names. In Nix, the package might be named `nodejs-18_x` rather than `nodejs_18`.

### Verification Steps

To verify that the deployment will work:

1. Run `bash build-for-easypanel.sh` locally to ensure the build completes successfully
2. Run `bash start-for-easypanel.sh` locally to ensure the application starts correctly
3. Check that both scripts have execute permissions (`chmod +x`)
4. Verify that all required environment variables are set
5. Confirm that the Node.js version matches your development environment

## Expected Outcome

With these configurations, your application should deploy successfully to EasyPanel with:
- Proper dependency resolution using the correct Nix package names
- Correct file paths
- Stable build and start processes
- Better error handling and reporting

Note: npm typically comes bundled with Node.js, so we only need to specify `nodejs-18_x` in the Nix packages. This should resolve the "undefined variable 'npm'" error that was occurring with the previous configuration.