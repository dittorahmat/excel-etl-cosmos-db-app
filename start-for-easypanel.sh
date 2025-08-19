#!/bin/bash

# Exit on any error
set -e

echo "=== Starting Application for EasyPanel Git Deployment ==="

# Navigate to the backend directory within the deployment output
cd backend

# Start the backend server in the background
echo "Starting backend server..."
node --enable-source-maps dist/src/server.js &

# Store the backend PID
BACKEND_PID=$!

# Navigate back to the deployment output root
cd ..

# Start the frontend static server
echo "Starting frontend static server..."
# Ensure 'serve' is installed and available in the PATH
# If 'serve' is not globally installed in the container, it needs to be installed locally
# or its path explicitly provided.
# Assuming 'serve' is installed via npm in the root node_modules
./node_modules/.bin/serve -s frontend -l 3000 &

# Store the frontend PID
FRONTEND_PID=$!

echo "Application started. Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID"

# Keep the script running to keep the container alive
wait $BACKEND_PID $FRONTEND_PID
