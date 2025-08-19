#!/bin/bash
set -e

echo "=== Using custom build script ==="

# Create deploy_output directory if it doesn't exist
mkdir -p deploy_output

# Copy the custom Dockerfile to the deploy_output directory
cp Dockerfile deploy_output/

# Copy the start script
cp start-for-easypanel.sh deploy_output/

# Copy necessary files for the build
cp -r package*.json server/ deploy_output/

# Build using the custom Dockerfile
docker build -f Dockerfile -t excel-etl-app .

# Create a container to copy files from
docker create --name temp-container excel-etl-app

# Copy the built files to deploy_output
docker cp temp-container:/app/server/dist deploy_output/server/
docker cp temp-container:/app/node_modules deploy_output/
docker cp temp-container:/app/server/node_modules deploy_output/server/

# Clean up
docker rm -f temp-container

echo "=== Build completed successfully ==="
