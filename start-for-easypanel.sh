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