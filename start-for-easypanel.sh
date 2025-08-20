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

# Check if we need to build first
if [ ! -d "dist" ] || [ ! -d "server/dist" ]; then
    echo "Build artifacts not found, building application..."
    
    # Clean previous builds
    echo "Cleaning previous builds..."
    rm -rf dist server/dist
    
    # Install root dependencies
    echo "Installing root dependencies..."
    npm ci --only=production --prefer-online || {
        echo "Retrying npm install..."
        sleep 5
        npm ci --only=production --prefer-online
    }
    
    # Install server dependencies
    echo "Installing server dependencies..."
    cd server
    npm ci --only=production --prefer-online || {
        echo "Retrying server npm install..."
        sleep 5
        npm ci --only=production --prefer-online
    }
    cd ..
    
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

# Install serve globally if not already installed
if ! command_exists serve; then
    echo "Installing serve globally..."
    npm install -g serve
fi

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
    BACKEND_PATH=$(find . -name "server.js" -path "*/server/dist/*" -type f | head -n 1)
fi

if [ -z "$FRONTEND_PATH" ] || [ ! -d "$FRONTEND_PATH" ]; then
    echo "Trying to locate frontend directory..."
    if [ -d "dist" ]; then
        FRONTEND_PATH="dist"
    elif [ -d "./dist" ]; then
        FRONTEND_PATH="./dist"
    else
        FRONTEND_PATH=$(find . -name "dist" -type d | grep -v node_modules | head -n 1)
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