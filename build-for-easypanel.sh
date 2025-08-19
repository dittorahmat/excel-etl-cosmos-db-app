#!/bin/bash

# Exit on any error
set -e

echo "=== Building for EasyPanel Git Deployment ==="

# Verify Node.js and npm are available
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Build frontend
echo "Building frontend..."
npm run build:client

# Build backend
echo "Building backend..."
cd server
npm install
npm run build
cd ..

echo "Build for EasyPanel Git Deployment completed successfully!"
