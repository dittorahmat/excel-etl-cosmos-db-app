#!/bin/bash

set -e

echo "PATH: $PATH"
echo "Checking for vite binary..."
ls -l node_modules/.bin || echo "node_modules/.bin does not exist!"
if [ -f node_modules/.bin/vite ]; then
  echo "Vite binary found in node_modules/.bin/vite"
else
  echo "Vite binary NOT found in node_modules/.bin/vite"
fi

echo "Vite version via npx:"
npx vite --version || echo "npx vite failed!"

echo "npm list vite:"
npm list vite || echo "vite not found in npm list!"

echo "Installing Vite and plugin-react if missing..."
npm install vite @vitejs/plugin-react --no-save

# Run the build
npm run build:client

echo "Build completed successfully!"
