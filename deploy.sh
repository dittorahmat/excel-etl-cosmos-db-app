#!/bin/bash

# Deployment script for Excel ETL Cosmos DB App
# This script pulls the latest code, rebuilds, and deploys the app

set -e  # Exit on any error

# Directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd $SCRIPT_DIR

# Log file for the deployment
LOG_FILE="logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

# Create logs directory if it doesn't exist
mkdir -p logs

log_message "Starting deployment process..."

# Pull the latest changes from the remote repository
log_message "Pulling latest changes from remote repository..."
if git pull origin main; then
    log_message "Successfully pulled latest changes"
else
    log_message "ERROR: Failed to pull changes"
    exit 1
fi

# Build the new Docker image
log_message "Building new Docker image..."
if docker-compose build excel-to-cosmos; then
    log_message "Successfully built new Docker image"
else
    log_message "ERROR: Failed to build Docker image"
    exit 1
fi

# Stop the existing excel-to-cosmos container
log_message "Stopping existing excel-to-cosmos container..."
if docker-compose stop excel-to-cosmos; then
    log_message "Successfully stopped excel-to-cosmos container"
else
    log_message "WARNING: Failed to stop excel-to-cosmos container, continuing..."
fi

# Remove the stopped container
log_message "Removing stopped container..."
if docker-compose rm -f excel-to-cosmos; then
    log_message "Successfully removed stopped container"
else
    log_message "WARNING: Failed to remove stopped container, continuing..."
fi

# Start the new container with the updated image
log_message "Starting new excel-to-cosmos container with updated image..."
if docker-compose up -d excel-to-cosmos; then
    log_message "Successfully started new excel-to-cosmos container"
else
    log_message "ERROR: Failed to start new excel-to-cosmos container"
    exit 1
fi

# Wait a bit for the container to start and become healthy
log_message "Waiting for container to become healthy..."
sleep 30

# Verify that the services are running properly
if docker-compose ps | grep -q "Up (healthy)"; then
    log_message "Deployment completed successfully! All services are healthy."
else
    log_message "WARNING: Deployment completed but services may not be healthy. Please check docker-compose ps."
fi

log_message "Deployment process finished at $(date)"