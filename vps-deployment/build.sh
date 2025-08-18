#!/bin/bash

# Excel ETL Application Build Script for VPS Deployment
# This script automates the build process for both frontend and backend

set -e  # Exit on any error

echo "=== Excel ETL Application Build Script ==="
echo "Starting build process for VPS deployment..."

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    log_error "This script must be run from the vps-deployment directory"
    log_error "Current directory: $(pwd)"
    exit 1
fi

# Clean previous builds if they exist
log "Cleaning previous build artifacts..."
rm -rf "$SCRIPT_DIR/frontend" "$SCRIPT_DIR/backend"
mkdir -p "$SCRIPT_DIR/frontend" "$SCRIPT_DIR/backend"

# Navigate to project root
cd "$PROJECT_ROOT"

# Check if root package.json exists
if [ ! -f "package.json" ]; then
    log_error "Root package.json not found"
    exit 1
fi

# Install root dependencies
log "Installing root dependencies..."
npm install

# Build the entire application
log "Building the full application..."
npm run build

# Copy frontend build to deployment directory
log "Copying frontend build files..."
if [ -d "dist" ]; then
    cp -r dist/* "$SCRIPT_DIR/frontend/"
    log_success "Frontend files copied successfully"
else
    log_error "Frontend build directory (dist) not found"
    exit 1
fi

# Copy backend build to deployment directory
log "Copying backend build files..."
if [ -d "server/dist" ]; then
    cp -r server/dist "$SCRIPT_DIR/backend/"
    log_success "Backend files copied successfully"
else
    log_error "Backend build directory (server/dist) not found"
    exit 1
fi

# Copy backend package files
log "Copying backend package files..."
cp server/package.json "$SCRIPT_DIR/backend/"
# Fix the main entry point path in package.json
log "Fixing main entry point path in backend package.json..."
sed -i 's|"dist/server/src/server.js"|"dist/src/server.js"|g' "$SCRIPT_DIR/backend/package.json"
sed -i 's|"node --enable-source-maps dist/server/src/server.js"|"node --enable-source-maps dist/src/server.js"|g' "$SCRIPT_DIR/backend/package.json"
cp server/package-lock.json "$SCRIPT_DIR/backend/"

# Update the main package.json version
log "Updating deployment package.json..."
cd "$SCRIPT_DIR"
CURRENT_TIME=$(date +"%Y%m%d-%H%M%S")
TEMP_PACKAGE=$(mktemp)
jq --arg version "$CURRENT_TIME" '.version = $version' package.json > "$TEMP_PACKAGE" && mv "$TEMP_PACKAGE" package.json
# Fix the main entry point path in root package.json
log "Fixing main entry point path in root package.json..."
sed -i 's|"backend/dist/server/src/server.js"|"backend/dist/src/server.js"|g' package.json

# Create a version file
echo "Build version: $CURRENT_TIME" > "$SCRIPT_DIR/version.txt"
echo "Build timestamp: $(date)" >> "$SCRIPT_DIR/version.txt"
# Fix the server start path in start.sh
log "Fixing server start path in start.sh..."
sed -i 's|node backend/dist/server/src/server.js|node backend/dist/src/server.js|g' "$SCRIPT_DIR/start.sh"

# Create/update README with build information
cat > "$SCRIPT_DIR/README.md" << EOF
# Excel ETL Application - VPS Deployment

This directory contains the built application ready for deployment to a VPS.

## Build Information
- Build Version: $CURRENT_TIME
- Build Timestamp: $(date)

## Contents
- \`frontend/\` - Built React frontend application
- \`backend/\` - Built Node.js backend application
- \`package.json\` - Deployment package configuration
- \`.env\` - Environment configuration (not included, must be created separately)
- \`start.sh\` - Startup script
- \`ecosystem.config.cjs\` - PM2 configuration

## Deployment Instructions

1. Copy this entire directory to your VPS
2. Install dependencies: \`npm install\`
3. Create a \`.env\` file with your configuration
4. Start the application: \`npm start\`

## Build Script
This package was created using the automated build script (\`build.sh\`).
EOF

log_success "=== Build completed successfully ==="
log_success "Deployment package is ready in $SCRIPT_DIR"
log_success "Build version: $CURRENT_TIME"

echo
log "Next steps:"
log "1. Transfer this directory to your VPS"
log "2. Run 'npm install' in the deployment directory"
log "3. Create a .env file with your configuration"
log "4. Start the application with 'npm start'"