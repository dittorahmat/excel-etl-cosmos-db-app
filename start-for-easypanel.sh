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

# Check common locations first
if [ -f "server/dist/src/server.js" ]; then
    BACKEND_PATH="server/dist/src/server.js"
    echo "Found backend at direct path: $BACKEND_PATH"
elif [ -f "./server/dist/src/server.js" ]; then
    BACKEND_PATH="./server/dist/src/server.js"
    echo "Found backend at relative path: $BACKEND_PATH"
fi

# If not found in common locations, try to find it
if [ -z "$BACKEND_PATH" ] || [ ! -f "$BACKEND_PATH" ]; then
    echo "Trying to locate backend server file..."
    BACKEND_PATH=$(find_file "*/server/dist/src/server.js" 5)
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