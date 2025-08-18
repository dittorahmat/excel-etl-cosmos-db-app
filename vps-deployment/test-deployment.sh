#!/bin/bash

# Test script to verify the structure of the VPS deployment package

set -e

echo "=== Testing VPS Deployment Package Structure ==="

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

log "Checking deployment package structure in $SCRIPT_DIR"

# Check for required files and directories
REQUIRED_FILES=(
    "package.json"
    "start.sh"
    "ecosystem.config.cjs"
    "build.sh"
    "README.md"
)

REQUIRED_DIRS=(
    "frontend"
    "backend"
)

MISSING_ITEMS=()

# Check for required files
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        log_success "Found required file: $file"
    else
        log_error "Missing required file: $file"
        MISSING_ITEMS+=("$file")
    fi
done

# Check for required directories
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$SCRIPT_DIR/$dir" ]; then
        log_success "Found required directory: $dir"
        
        # Check for content in directories
        if [ "$dir" = "frontend" ]; then
            if [ -f "$SCRIPT_DIR/$dir/index.html" ] || [ -d "$SCRIPT_DIR/$dir/assets" ]; then
                log_success "Frontend directory has content"
            else
                log_warning "Frontend directory appears to be empty"
            fi
        elif [ "$dir" = "backend" ]; then
            if [ -f "$SCRIPT_DIR/$dir/package.json" ] && [ -d "$SCRIPT_DIR/$dir/dist" ]; then
                log_success "Backend directory has content"
            else
                log_warning "Backend directory appears to be empty"
            fi
        fi
    else
        log_error "Missing required directory: $dir"
        MISSING_ITEMS+=("$dir")
    fi
done

# Check package.json for required scripts
if [ -f "$SCRIPT_DIR/package.json" ]; then
    log "Checking package.json scripts..."
    
    # Check for required scripts
    REQUIRED_SCRIPTS=("start" "start:backend" "start:frontend")
    
    for script in "${REQUIRED_SCRIPTS[@]}"; do
        if grep -q "\"$script\":" "$SCRIPT_DIR/package.json"; then
            log_success "Found required script: $script"
        else
            log_error "Missing required script: $script"
            MISSING_ITEMS+=("script:$script")
        fi
    done
else
    log_error "package.json not found"
    MISSING_ITEMS+=("package.json")
fi

# Report results
if [ ${#MISSING_ITEMS[@]} -eq 0 ]; then
    log_success "=== All required items are present ==="
    exit 0
else
    log_error "=== Missing ${#MISSING_ITEMS[@]} required items ==="
    for item in "${MISSING_ITEMS[@]}"; do
        echo "  - $item"
    done
    exit 1
fi