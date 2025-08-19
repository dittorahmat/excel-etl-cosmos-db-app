#!/bin/bash
set -e

echo "=== Using custom build script ==="

# Install required system dependencies
echo "Installing system dependencies..."
apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    lsb-release

# Install Node.js 18.x
echo "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# Verify installations
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Create deploy_output directory if it doesn't exist
mkdir -p deploy_output

# Copy necessary files
echo "Copying necessary files..."
cp -r package*.json server/ start-for-easypanel.sh deploy_output/

# Install dependencies
echo "Installing dependencies..."
cd deploy_output
npm install
cd server
npm install --include=dev
cd ../..

# Build the application
echo "Building the application..."
cd deploy_output/server
npm run build
cd ../..

# Create necessary directories
mkdir -p deploy_output/server/dist

# Copy built files
echo "Copying built files..."
cp -r server/dist/* deploy_output/server/dist/
cp -r node_modules deploy_output/
cp -r server/node_modules deploy_output/server/

echo "=== Build completed successfully ==="
