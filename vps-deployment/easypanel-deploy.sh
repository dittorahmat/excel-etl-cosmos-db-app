#!/bin/bash

# Excel ETL Application Deployment Script for EasyPanel
# This script automates the deployment process for EasyPanel

set -e  # Exit on any error

echo "=== Excel ETL Application EasyPanel Deployment ==="

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
if [ ! -f "package.json" ]; then
    log_error "This script must be run from the deployment directory"
    log_error "Current directory: $(pwd)"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_warning ".env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log "Created .env file from .env.example"
        log_warning "Please edit .env with your Azure configuration before starting the application"
    else
        log_error ".env.example file not found. Cannot create .env file"
        exit 1
    fi
else
    log "Found existing .env file"
fi

# Install dependencies
log "Installing dependencies..."
npm install
log_success "Dependencies installed successfully"

# Build the application (if needed)
log "Building application..."
npm run build 2>/dev/null || {
    log "No build script found or build failed. Continuing with existing files..."
}

# Start the application
log "Starting application..."
npm start &

# Store the process ID
APP_PID=$!

# Wait a moment for the application to start
sleep 5

# Check if application started successfully
if ps -p $APP_PID > /dev/null; then
    log_success "Application started successfully (PID: $APP_PID)"
    log_success "Application is now running!"
    
    # Get port from .env or default to 3001
    if [ -f ".env" ]; then
        PORT=$(grep "^PORT=" .env | cut -d'=' -f2)
    fi
    PORT=${PORT:-3001}
    
    log "Access your application at: http://localhost:$PORT"
    log "Backend API endpoints: http://localhost:$PORT/api/"
else
    log_error "Failed to start application"
    exit 1
fi

# Clean up on exit
trap "kill $APP_PID 2>/dev/null; exit" INT TERM

# Wait for the application process
wait $APP_PID