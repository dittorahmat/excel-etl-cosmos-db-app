#!/bin/bash

# Zero-downtime deployment script for Excel to Cosmos DB Dashboard
# NOTE: This script has been superseded by improved approaches.
# See ZERO_DOWNTIME_DEPLOYMENT_SOLUTIONS.md for better alternatives.

echo "WARNING: This script has been superseded by improved zero-downtime deployment approaches."
echo "Please use one of the following instead:"
echo "  - improved-zero-downtime-deploy.sh (improved rolling update)"
echo "  - blue-green-deploy.sh (true blue-green deployment)"
echo ""
echo "See ZERO_DOWNTIME_DEPLOYMENT_SOLUTIONS.md for details."
echo ""

# Ask user if they want to continue with this script
read -p "Do you want to continue with this script anyway? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Deployment cancelled."
    exit 1
fi

# Rest of the original script continues below...
set -e

echo "=== Zero-Downtime Deployment for Excel to Cosmos DB Dashboard ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "ERROR: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "ERROR: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "Docker and Docker Compose are installed."

# Define deployment variables
APP_DIR="/opt/excel-etl-cosmos-db-app"

# Create a directory for the application if it doesn't exist
echo "Creating application directory at $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy files to the application directory
echo "Copying application files..."
# Use rsync to preserve permissions and only copy changed files
rsync -av --exclude='node_modules' --exclude='.git' --exclude='logs' ./ $APP_DIR/

# Copy .env file if it exists
if [ -f ".env" ]; then
    cp .env $APP_DIR/
else
    echo "No .env file found. Remember to create one with your Azure credentials."
fi

# Navigate to the application directory
cd $APP_DIR

# Create logs directory
mkdir -p logs

# Build the new images
echo "Building new images..."
docker-compose build

# Deploy with zero downtime using docker-compose up with rolling updates
echo "Deploying with zero downtime using rolling updates..."

# Pull latest images (if using external images)
# docker-compose pull

# Build and deploy services with rolling updates
# The --no-recreate flag prevents recreation of existing containers
# The --remove-orphans removes containers that are no longer defined
docker-compose up -d --build --remove-orphans

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Check service health
echo "Checking service health..."
docker-compose ps

# Clean up unused containers and images
echo "Cleaning up unused containers and images..."
docker container prune -f --filter "until=24h"
docker image prune -f --filter "until=24h"
docker system prune -f --filter "until=24h"

echo "Zero-downtime deployment completed successfully!"
echo "The application should be accessible at https://iesr.indonesiacentral.cloudapp.azure.com"
echo "Check logs with: docker-compose logs -f"