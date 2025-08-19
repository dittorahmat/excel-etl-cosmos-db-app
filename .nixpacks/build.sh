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

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies and build server
echo "Installing server dependencies and building server..."
cd server
npm install --include=dev
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
cp -r server/dist deploy_output/server/
cp -r node_modules deploy_output/
cp -r server/node_modules deploy_output/server/

echo "=== Build completed successfully ==="
