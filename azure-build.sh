#!/bin/bash

set -e

echo "Starting Azure build process..."

# Run the main build script defined in package.json
npm run build

echo "Azure build completed successfully!"