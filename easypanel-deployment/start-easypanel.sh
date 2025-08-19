#!/bin/bash

# Exit on any error
set -e

echo "=== EasyPanel Start Script ==="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: This script must be run from the deployment directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "Current directory: $(pwd)"
echo "Directory contents:"
ls -la

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "Error: backend directory not found"
    exit 1
fi

echo "Backend directory contents:"
ls -la backend

# Check if source files exist
if [ ! -d "backend/src" ]; then
    echo "Error: backend/src directory not found"
    exit 1
fi

echo "Backend src directory contents:"
ls -la backend/src

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the backend
echo "Building backend application..."
cd backend
npm install
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "Error: Build failed, dist directory not found"
    exit 1
fi

echo "Build successful, dist directory contents:"
ls -la dist

if [ ! -d "dist/src" ]; then
    echo "Error: dist/src directory not found"
    exit 1
fi

echo "dist/src directory contents:"
ls -la dist/src

# Check if server.js exists
if [ ! -f "dist/src/server.js" ]; then
    echo "Error: dist/src/server.js not found"
    exit 1
fi

echo "server.js found, starting application..."

# Start the backend server
echo "Starting backend server..."
node --enable-source-maps dist/src/server.js