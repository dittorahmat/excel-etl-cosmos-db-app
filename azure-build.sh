#!/bin/bash

# Exit on error
set -e

# Install Vite locally if not already installed
if [ ! -d "node_modules/vite" ]; then
  echo "Installing Vite locally..."
  npm install vite --save-dev
fi

# Run the build
npm run build:client

echo "Build completed successfully!"
