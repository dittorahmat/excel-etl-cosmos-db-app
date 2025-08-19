#!/bin/bash

# Exit on any error
set -e

echo "=== Building for EasyPanel Git Deployment ==="

# Define output directory
DEPLOY_OUTPUT_DIR="deploy_output"

# Ensure output subdirectories exist
mkdir -p "$DEPLOY_OUTPUT_DIR/backend"
mkdir -p "$DEPLOY_OUTPUT_DIR/frontend"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install backend dependencies and build backend
echo "Installing backend dependencies and building backend..."
npm install --prefix backend --include=dev
backend/node_modules/.bin/tsc -p backend/tsconfig.build.json

# Copy built backend to output directory
echo "Copying built backend to $DEPLOY_OUTPUT_DIR/backend"
cp -R backend/dist "$DEPLOY_OUTPUT_DIR/backend/"
cp backend/package.json "$DEPLOY_OUTPUT_DIR/backend/"
cp backend/package-lock.json "$DEPLOY_OUTPUT_DIR/backend/"

# Copy pre-built frontend to output directory
echo "Copying pre-built frontend from easypanel-deployment/frontend to $DEPLOY_OUTPUT_DIR/frontend"
cp -R easypanel-deployment/frontend/* "$DEPLOY_OUTPUT_DIR/frontend/"

# Copy the unified start script to the output directory
echo "Copying start-for-easypanel.sh to $DEPLOY_OUTPUT_DIR"
cp start-for-easypanel.sh "$DEPLOY_OUTPUT_DIR/"

echo "Build for EasyPanel Git Deployment completed successfully!"
