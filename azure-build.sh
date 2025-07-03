#!/bin/bash

set -e

echo "Starting Azure build process..."

# Install dependencies using npm ci for a clean install
npm ci

# Run the main build script defined in package.json
npm run build

echo "Azure build completed successfully!"
