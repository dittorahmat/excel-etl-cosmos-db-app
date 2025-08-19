#!/bin/bash

# Exit on any error
set -e

echo "=== Starting Application for EasyPanel Git Deployment ==="

# Install serve globally if not already installed
if ! command -v serve &> /dev/null; then
    echo "Installing serve globally..."
    npm install -g serve
fi

# Start the backend server in the background
echo "Starting backend server..."
node --enable-source-maps server/dist/src/server.js &

# Store the backend PID
BACKEND_PID=$!

# Start the frontend static server
echo "Starting frontend static server..."
serve -s dist -l 3000 &

# Store the frontend PID
FRONTEND_PID=$!

echo "Application started. Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"

# Keep the script running to keep the container alive
wait $BACKEND_PID $FRONTEND_PID
