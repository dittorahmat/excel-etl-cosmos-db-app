#!/bin/bash

# Exit on any error
set -e

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please create a .env file with your configuration."
    exit 1
fi

# Load environment variables
export $(cat .env | xargs)

# Start the backend server in the background
echo "Starting backend server..."
node backend/dist/src/server.js &

# Store the process ID
BACKEND_PID=$!

# Wait a moment for the backend to start
sleep 3

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo "Backend server started successfully (PID: $BACKEND_PID)"
    echo "Application is now running!"
    echo "Backend API: http://localhost:${PORT:-3001}"
    echo "Frontend: http://localhost:${PORT:-3001}"
else
    echo "Error: Failed to start backend server"
    exit 1
fi

# Wait for the backend process
wait $BACKEND_PID