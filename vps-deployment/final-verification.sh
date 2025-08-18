#!/bin/bash

# Final verification script for the VPS deployment package

set -e

echo "=== Final Verification of VPS Deployment Package ==="

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

log "Verifying deployment package in $SCRIPT_DIR"

# Counter for issues
ERROR_COUNT=0
WARNING_COUNT=0

# Function to record errors
record_error() {
    ((ERROR_COUNT++))
    log_error "$1"
}

# Function to record warnings
record_warning() {
    ((WARNING_COUNT++))
    log_warning "$1"
}

# 1. Check for essential files
log "Checking for essential files..."

ESSENTIAL_FILES=(
    "package.json"
    "start.sh"
    "ecosystem.config.cjs"
    "build.sh"
    "README.md"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        log_success "Found essential file: $file"
    else
        record_error "Missing essential file: $file"
    fi
done

# 2. Check for essential directories
log "Checking for essential directories..."

ESSENTIAL_DIRS=(
    "frontend"
    "backend"
)

for dir in "${ESSENTIAL_DIRS[@]}"; do
    if [ -d "$SCRIPT_DIR/$dir" ]; then
        log_success "Found essential directory: $dir"
    else
        record_error "Missing essential directory: $dir"
    fi
done

# 3. Check frontend content
log "Checking frontend content..."

if [ -d "$SCRIPT_DIR/frontend" ]; then
    if [ -f "$SCRIPT_DIR/frontend/index.html" ]; then
        log_success "Frontend index.html found"
    else
        record_warning "Frontend index.html not found"
    fi
    
    if [ -d "$SCRIPT_DIR/frontend/assets" ]; then
        ASSET_COUNT=$(ls -1 "$SCRIPT_DIR/frontend/assets" | wc -l)
        if [ "$ASSET_COUNT" -gt 0 ]; then
            log_success "Frontend assets directory contains $ASSET_COUNT files"
        else
            record_warning "Frontend assets directory is empty"
        fi
    else
        record_warning "Frontend assets directory not found"
    fi
else
    record_error "Frontend directory not found"
fi

# 4. Check backend content
log "Checking backend content..."

if [ -d "$SCRIPT_DIR/backend" ]; then
    if [ -f "$SCRIPT_DIR/backend/package.json" ]; then
        log_success "Backend package.json found"
    else
        record_error "Backend package.json not found"
    fi
    
    if [ -d "$SCRIPT_DIR/backend/dist" ]; then
        if [ -f "$SCRIPT_DIR/backend/dist/src/server.js" ]; then
            log_success "Backend server.js entry point found"
        else
            record_error "Backend server.js entry point not found"
        fi
        
        # Count source files
        SRC_COUNT=$(find "$SCRIPT_DIR/backend/dist/src" -name "*.js" | wc -l)
        if [ "$SRC_COUNT" -gt 0 ]; then
            log_success "Backend dist contains $SRC_COUNT compiled JavaScript files"
        else
            record_warning "Backend dist contains no compiled JavaScript files"
        fi
    else
        record_error "Backend dist directory not found"
    fi
else
    record_error "Backend directory not found"
fi

# 5. Check package.json scripts
log "Checking package.json scripts..."

if [ -f "$SCRIPT_DIR/package.json" ]; then
    REQUIRED_SCRIPTS=("start" "start:backend" "start:frontend")
    
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" "$SCRIPT_DIR/package.json"; then
            log_success "Found required script: $script"
        else
            record_error "Missing required script: $script"
        fi
    done
    
    # Check that start script points to the right place
    if grep -q "\"start\": \"node backend/dist/server/src/server.js\"" "$SCRIPT_DIR/package.json"; then
        log_success "Start script correctly points to backend entry point"
    elif grep -q "\"start\":" "$SCRIPT_DIR/package.json"; then
        START_CMD=$(grep "\"start\":" "$SCRIPT_DIR/package.json" | cut -d '"' -f 4)
        log_warning "Start script points to: $START_CMD"
    else
        record_error "No start script found in package.json"
    fi
else
    record_error "package.json not found"
fi

# 6. Check startup script
log "Checking startup script..."

if [ -f "$SCRIPT_DIR/start.sh" ]; then
    # Check if it's executable
    if [ -x "$SCRIPT_DIR/start.sh" ]; then
        log_success "Startup script is executable"
    else
        record_warning "Startup script is not executable (chmod +x start.sh)"
    fi
    
    # Check for key content
    if grep -q "node backend/dist/server/src/server.js" "$SCRIPT_DIR/start.sh"; then
        log_success "Startup script references correct backend entry point"
    else
        record_warning "Startup script may not reference correct backend entry point"
    fi
else
    record_error "Startup script (start.sh) not found"
fi

# 7. Check build script
log "Checking build script..."

if [ -f "$SCRIPT_DIR/build.sh" ]; then
    if [ -x "$SCRIPT_DIR/build.sh" ]; then
        log_success "Build script is executable"
    else
        record_warning "Build script is not executable (chmod +x build.sh)"
    fi
    
    # Check for key content
    if grep -q "Excel ETL Application Build Script" "$SCRIPT_DIR/build.sh"; then
        log_success "Build script has correct identification"
    else
        record_warning "Build script may not be the correct one"
    fi
else
    record_error "Build script (build.sh) not found"
fi

# Summary
echo
log "=== VERIFICATION SUMMARY ==="

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    log_success "All checks passed! The deployment package is ready for VPS deployment."
    log_success "You can now transfer this directory to your VPS and follow the deployment instructions in README.md"
elif [ $ERROR_COUNT -eq 0 ]; then
    log_warning "Verification completed with $WARNING_COUNT warnings."
    log "The package should work but you may want to address the warnings."
else
    log_error "Verification completed with $ERROR_COUNT errors and $WARNING_COUNT warnings."
    log_error "Please fix the errors before deploying to production."
fi

echo
log "Next steps:"
log "1. Transfer this directory to your VPS"
log "2. Install dependencies: npm install"
log "3. Create a .env file with your configuration"
log "4. Start the application: npm start"

exit $ERROR_COUNT