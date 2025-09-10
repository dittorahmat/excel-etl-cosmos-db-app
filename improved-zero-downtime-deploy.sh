#!/bin/bash

# Improved Zero-Downtime Deployment Script for Excel to Cosmos DB Dashboard
# Uses rolling update strategy with proper health checks

set -e

echo "=== Improved Zero-Downtime Deployment for Excel to Cosmos DB Dashboard ==="

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
APP_NAME="excel-etl-cosmos-db-app"
APP_DIR="/opt/${APP_NAME}"

# Create application directory if it doesn't exist
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

# Deploy with improved zero downtime approach
echo "Deploying with improved zero downtime approach..."

# Update services one by one to minimize downtime
echo "Updating excel-to-cosmos service..."
docker-compose up -d --no-deps --build excel-to-cosmos

# Wait for the service to be healthy
echo "Waiting for excel-to-cosmos service to be healthy..."
HEALTHY=false
RETRIES=30
SLEEP_INTERVAL=5

for i in $(seq 1 $RETRIES); do
    if docker-compose exec excel-to-cosmos curl -f http://localhost:3000/health &>/dev/null; then
        HEALTHY=true
        break
    fi
    echo "Waiting for excel-to-cosmos service to be healthy... ($i/$RETRIES)"
    sleep $SLEEP_INTERVAL
done

if [ "$HEALTHY" = false ]; then
    echo "ERROR: excel-to-cosmos service did not become healthy in time."
    exit 1
fi

echo "excel-to-cosmos service is healthy!"

# Update nginx service
echo "Updating nginx service..."
docker-compose up -d --no-deps nginx

# Wait a moment for nginx to stabilize
sleep 5

# Check overall service health
echo "Checking overall service health..."
docker-compose ps

# Clean up unused containers and images
echo "Cleaning up unused containers and images..."
docker container prune -f --filter "until=24h"
docker image prune -f --filter "until=24h"
docker system prune -f --filter "until=24h"

echo "Improved zero-downtime deployment completed successfully!"
echo "The application should be accessible at https://iesr.indonesiacentral.cloudapp.azure.com"
echo "Check logs with: docker-compose logs -f"