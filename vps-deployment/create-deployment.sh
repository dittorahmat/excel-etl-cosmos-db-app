#!/bin/bash

# Complete deployment package creation and verification script

set -e

echo "=== Complete Deployment Package Creation and Verification ==="

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

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log "Working in directory: $SCRIPT_DIR"

# Check if we're in the vps-deployment directory
if [[ ! "$SCRIPT_DIR" == *"vps-deployment" ]]; then
    log_error "This script must be run from within the vps-deployment directory"
    exit 1
fi

log "Starting complete deployment package process..."

# Step 1: Run the build script
log "Step 1: Running build script..."
if [ -f "$SCRIPT_DIR/build.sh" ]; then
    if [ -x "$SCRIPT_DIR/build.sh" ]; then
        ./build.sh
        log_success "Build script completed"
    else
        log_error "Build script is not executable"
        exit 1
    fi
else
    log_error "Build script not found"
    exit 1
fi

# Step 2: Run deployment structure test
log "Step 2: Running deployment structure test..."
if [ -f "$SCRIPT_DIR/test-deployment.sh" ]; then
    if [ -x "$SCRIPT_DIR/test-deployment.sh" ]; then
        ./test-deployment.sh
        log_success "Deployment structure test completed"
    else
        log_error "Deployment structure test script is not executable"
        exit 1
    fi
else
    log_error "Deployment structure test script not found"
    exit 1
fi

# Step 3: Run final verification
log "Step 3: Running final verification..."
if [ -f "$SCRIPT_DIR/final-verification.sh" ]; then
    if [ -x "$SCRIPT_DIR/final-verification.sh" ]; then
        ./final-verification.sh
        log_success "Final verification completed"
    else
        log_error "Final verification script is not executable"
        exit 1
    fi
else
    log_error "Final verification script not found"
    exit 1
fi

# Step 4: Create version file
log "Step 4: Creating version file..."
echo "Deployment Package Version: $(date +%Y%m%d-%H%M%S)" > VERSION
echo "Generated on: $(date)" >> VERSION
log_success "Version file created"

log_success "=== COMPLETE DEPLOYMENT PACKAGE PROCESS FINISHED SUCCESSFULLY ==="
log "The deployment package is now ready for VPS deployment"
log ""
log "Summary of what was created:"
log "- Frontend application in frontend/"
log "- Backend application in backend/"
log "- All necessary configuration files"
log "- Automation scripts for future updates"
log "- Comprehensive documentation"
log ""
log "To deploy to your VPS:"
log "1. Transfer this entire directory to your VPS"
log "2. Follow the instructions in README.md or QUICK-DEPLOY.md"
log "3. Customize the .env file with your Azure credentials"
log "4. Start the application with 'npm start' or PM2"