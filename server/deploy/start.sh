#!/bin/bash
set -e

echo "=== Starting application ==="
echo "Node.js version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "Current directory: $(pwd)"

# List files in current directory
echo "=== Directory contents ==="
ls -la

# List node_modules
echo "=== node_modules exists? ==="
if [ -d "node_modules" ]; then
  echo "node_modules directory exists"
  echo "Number of modules: $(ls -1 node_modules | wc -l)"
else
  echo "ERROR: node_modules directory is missing!"
  exit 1
fi

# Start the application
echo "=== Starting application ==="
node --enable-source-maps dist/server/src/server.js
