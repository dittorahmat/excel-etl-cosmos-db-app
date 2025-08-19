#!/bin/bash

# Set the logging directory to a writable location in Azure App Service
# HOME is typically /home in Azure App Service
if [ -n "$HOME" ] && [ -d "$HOME" ]; then
    export LOGGING_DIR="$HOME/LogFiles/app"
else
    export LOGGING_DIR="./logs"
fi

# Create the directory if it doesn't exist
if [ ! -d "$LOGGING_DIR" ]; then
    mkdir -p "$LOGGING_DIR"
fi

echo "Starting application with LOGGING_DIR=$LOGGING_DIR"

# Check if dist/src/server.js exists
if [ ! -f "dist/src/server.js" ]; then
    echo "ERROR: dist/src/server.js not found!"
    echo "Current directory contents:"
    ls -la
    echo "dist directory contents:"
    if [ -d "dist" ]; then
        ls -la dist/
    fi
    if [ -d "dist/src" ]; then
        ls -la dist/src/
    fi
    exit 1
fi

# Start the application
node --enable-source-maps dist/src/server.js