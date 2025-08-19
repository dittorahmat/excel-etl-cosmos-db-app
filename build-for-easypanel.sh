#!/bin/bash

# Exit on any error
set -e

echo "=== Building for EasyPanel Git Deployment ==="

# Define directories
DEPLOY_OUTPUT_DIR="deploy_output"
EASYPANEL_ENV_PATH="/etc/easypanel/projects/dashboard/iesr/code/deploy_output"

# Create .env file in the root directory
echo "# Auto-generated .env file" > ".env"

# Add environment variables to root .env
for var in $(env | grep -v '^_' | grep -v '^\s*#' | cut -d= -f1); do
  if [[ $var != "HOME" && $var != "PATH" && $var != "PWD" && $var != "SHELL" && $var != "SHLVL" ]]; then
    echo "$var=${!var}" >> ".env"
  fi
done

# Ensure output directory and subdirectories exist
mkdir -p "$DEPLOY_OUTPUT_DIR/backend"
mkdir -p "$DEPLOY_OUTPUT_DIR/frontend"

# Create parent directories for EASYPANEL_ENV_PATH if they don't exist
mkdir -p "$(dirname "$EASYPANEL_ENV_PATH")"

# Create the .env file in the exact location EasyPanel is looking for
echo "# Auto-generated .env file for EasyPanel" > "$EASYPANEL_ENV_PATH/.env"

# Copy environment variables to the EasyPanel .env location
cat ".env" >> "$EASYPANEL_ENV_PATH/.env"

# Also copy to our deploy_output directory
cp ".env" "$DEPLOY_OUTPUT_DIR/.env"

# Debug: List files to verify .env was created
echo "=== Current directory structure ==="
ls -la

echo "=== deploy_output directory ==="
ls -la "$DEPLOY_OUTPUT_DIR/"

echo "=== EasyPanel env directory ==="
ls -la "$(dirname "$EASYPANEL_ENV_PATH")"

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
