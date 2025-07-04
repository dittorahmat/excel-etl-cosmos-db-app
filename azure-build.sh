#!/bin/bash

set -e

echo "========================================"
echo "Starting Azure build process..."
echo "========================================"

# Ensure .env.production exists
if [ ! -f ".env.production" ]; then
    echo "Error: .env.production file not found!"
    exit 1
fi

# Print environment info for debugging
echo "=== Environment Information ==="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Print the .env.production file contents (without sensitive values)
echo -e "\n=== .env.production contents (sensitive values masked) ==="
grep -v '^VITE_AZURE_' .env.production || true

# Install dependencies using npm ci for a clean install
echo -e "\n=== Installing dependencies ==="
NODE_ENV=development npm ci

# Run the main build script defined in package.json
echo -e "\n=== Starting build process ==="
NODE_ENV=production npm run build

# Verify the build output
echo -e "\n=== Verifying build output ==="
if [ -d "dist" ]; then
    echo "Build output found in dist/ directory"
    echo "Dist directory contents:"
    ls -la dist/
else
    echo "Error: Build output not found in dist/ directory!"
    exit 1
fi

echo -e "\n✅ Azure build completed successfully!"
