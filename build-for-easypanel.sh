#!/bin/bash

# Exit on any error
set -e

echo "=== Building for EasyPanel Git Deployment ==="

# Define output directory
DEPLOY_OUTPUT_DIR="deploy_output"

# Ensure output subdirectories exist
mkdir -p "$DEPLOY_OUTPUT_DIR/backend"
mkdir -p "$DEPLOY_OUTPUT_DIR/frontend"

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get update
    apt-get install -y nodejs
fi

# Verify Node.js and npm are available
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies and build server
echo "Installing server dependencies and building server..."
cd server
npm install --include=dev
npm run build
cd ..

# Copy necessary files to deploy_output
echo "Copying files to $DEPLOY_OUTPUT_DIR..."
cp -R server/dist "$DEPLOY_OUTPUT_DIR/backend/dist"
cp server/package.json "$DEPLOY_OUTPUT_DIR/backend/"
cp server/package-lock.json "$DEPLOY_OUTPUT_DIR/backend/" 2>/dev/null || true

# Copy start script
cp start-for-easypanel.sh "$DEPLOY_OUTPUT_DIR/"
chmod +x "$DEPLOY_OUTPUT_DIR/start-for-easypanel.sh"

echo "Build completed successfully!"

# Copy built server to output directory
echo "Copying built server to $DEPLOY_OUTPUT_DIR/backend"
cp -R server/dist "$DEPLOY_OUTPUT_DIR/backend/"
cp server/package.json "$DEPLOY_OUTPUT_DIR/backend/"
cp server/package-lock.json "$DEPLOY_OUTPUT_DIR/backend/"

# Copy pre-built frontend to output directory
echo "Copying pre-built frontend from easypanel-deployment/frontend to $DEPLOY_OUTPUT_DIR/frontend"
cp -R easypanel-deployment/frontend/* "$DEPLOY_OUTPUT_DIR/frontend/"

# Copy the unified start script to the output directory
echo "Copying start-for-easypanel.sh to $DEPLOY_OUTPUT_DIR"
cp start-for-easypanel.sh "$DEPLOY_OUTPUT_DIR/"

echo "Build for EasyPanel Git Deployment completed successfully!"
