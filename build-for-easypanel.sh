#!/bin/bash

# Exit on any error
set -e

echo "=== Building for EasyPanel Git Deployment ==="

# Verify Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed or not in PATH"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist server/dist

# Retry mechanism for npm installs
install_with_retry() {
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt of $max_attempts: $1"
        if eval "$1"; then
            echo "Success on attempt $attempt"
            return 0
        else
            echo "Failed on attempt $attempt"
            if [ $attempt -lt $max_attempts ]; then
                echo "Waiting 5 seconds before retry..."
                sleep 5
            fi
            ((attempt++))
        fi
    done
    
    echo "Failed after $max_attempts attempts"
    return 1
}

# Install dependencies with retry
echo "Installing root dependencies..."
install_with_retry "npm ci --only=production --prefer-online"

# Install server dependencies
echo "Installing server dependencies..."
cd server
install_with_retry "npm ci --only=production --prefer-online"
cd ..

# Check if vite.config.js exists and install missing dependencies
if [ -f "vite.config.js" ]; then
    echo "Checking for missing Vite dependencies..."
    
    # Check for @vitejs/plugin-react
    if ! npm list @vitejs/plugin-react &> /dev/null; then
        echo "Installing missing @vitejs/plugin-react..."
        npm install @vitejs/plugin-react --save-dev
    fi
    
    # Check for other potential missing dependencies
    if ! npm list vite &> /dev/null; then
        echo "Installing missing vite..."
        npm install vite --save-dev
    fi
fi

# Build frontend
echo "Building frontend..."
npm run build:client

# Build backend
echo "Building backend..."
cd server
npm run build
cd ..

echo "Build for EasyPanel Git Deployment completed successfully!"