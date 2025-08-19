#!/bin/bash

# Exit on any error
set -e

echo "=== Building for EasyPanel Git Deployment ==="

# Define output directory
DEPLOY_OUTPUT_DIR="deploy_output"

# Ensure output directory and subdirectories exist
mkdir -p "$DEPLOY_OUTPUT_DIR/backend"
mkdir -p "$DEPLOY_OUTPUT_DIR/frontend"

# Make sure generate-env.sh is executable
chmod +x generate-env.sh

# Generate the .env file in the deploy_output directory
./generate-env.sh

# Also create a root .env file for any build-time requirements
touch ".env"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies and build server
echo "Installing server dependencies and building server..."
cd server
npm install --include=dev
npm run build
cd ..

# Copy built server to output directory
echo "Copying built server to $DEPLOY_OUTPUT_DIR/backend"
cp -R server/dist "$DEPLOY_OUTPUT_DIR/backend/"
cp server/package.json "$DEPLOY_OUTPUT_DIR/backend/"
cp server/package-lock.json "$DEPLOY_OUTPUT_DIR/backend/"

# Copy pre-built frontend to output directory
echo "Copying pre-built frontend from easypanel-deployment/frontend to $DEPLOY_OUTPUT_DIR/frontend"
cp -R easypanel-deployment/frontend/* "$DEPLOY_OUTPUT_DIR/frontend/"

# Copy the unified start script to the output directory
echo "Copying start-for-easypanel.sh to $DEPLOY_OUTPUT_DIR"
cp start-for-easypanel.sh "$DEPLOY_OUTPUT_DIR/"

echo "Build for EasyPanel Git Deployment completed successfully!"
