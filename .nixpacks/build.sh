#!/bin/bash
set -e

echo "=== Using custom build script ==="

# Verify Node.js and npm are available (should be provided by Nixpacks)
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install root dependencies
echo "Installing root dependencies..."
npm ci --only=production

# Install server dependencies and build server
echo "Installing server dependencies and building server..."
cd server
npm ci --only=production
npm run build
cd ..

# Create deploy_output directory if it doesn't exist
mkdir -p deploy_output

# Copy necessary files
echo "Copying necessary files..."
cp -r package*.json deploy_output/
cp -r server/package*.json deploy_output/server/
cp start-for-easypanel.sh deploy_output/

# Copy built files
echo "Copying built files..."
cp -r dist deploy_output/ 2>/dev/null || echo "No dist directory to copy"
cp -r server/dist deploy_output/server/ 2>/dev/null || echo "No server/dist directory to copy"
cp -r node_modules deploy_output/ 2>/dev/null || echo "No node_modules directory to copy"
cp -r server/node_modules deploy_output/server/ 2>/dev/null || echo "No server/node_modules directory to copy"

echo "=== Build completed successfully ==="