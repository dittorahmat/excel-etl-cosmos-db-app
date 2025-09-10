#!/bin/bash

# Test script for zero-downtime deployment approaches

echo "=== Testing Zero-Downtime Deployment Approaches ==="

# Check if required tools are installed
if ! command -v docker &> /dev/null
then
    echo "ERROR: Docker is not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null
then
    echo "ERROR: Docker Compose is not installed."
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"

# Check if deployment scripts exist
SCRIPTS=("improved-zero-downtime-deploy.sh")

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        echo "✓ $script exists and is executable"
    else
        echo "✗ $script is missing or not executable"
    fi
done

# Check if documentation exists
if [ -f "ZERO_DOWNTIME_DEPLOYMENT_SOLUTIONS.md" ]; then
    echo "✓ ZERO_DOWNTIME_DEPLOYMENT_SOLUTIONS.md exists"
else
    echo "✗ ZERO_DOWNTIME_DEPLOYMENT_SOLUTIONS.md is missing"
fi

echo ""
echo "Run the deployment script with:"
echo "  ./improved-zero-downtime-deploy.sh"