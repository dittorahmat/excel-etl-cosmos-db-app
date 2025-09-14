#!/bin/bash

# True Zero-Downtime Deployment Script for Excel to Cosmos DB Dashboard
# Uses Docker Compose's native rolling update strategy with proper health checks

set -e

echo "=== True Zero-Downtime Deployment for Excel to Cosmos DB Dashboard ==="

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

# Use Docker Compose's native rolling update capability for zero downtime
echo "Building and deploying with zero downtime..."
docker-compose up -d --build --remove-orphans

# Wait for all services to be healthy
echo "Waiting for all services to be healthy..."
HEALTHY=false
RETRIES=30
SLEEP_INTERVAL=5

for i in $(seq 1 $RETRIES); do
    # Check if all services are healthy
    TOTAL_SERVICES=$(docker-compose ps --services | wc -l)
    HEALTHY_SERVICES=$(docker-compose ps | grep "(healthy)" | wc -l)
    
    if [ "$HEALTHY_SERVICES" -eq "$TOTAL_SERVICES" ]; then
        HEALTHY=true
        break
    fi
    
    echo "Waiting for services to be healthy... ($i/$RETRIES)"
    sleep $SLEEP_INTERVAL
done

if [ "$HEALTHY" = false ]; then
    echo "ERROR: Services did not become healthy in time."
    docker-compose ps
    exit 1
fi

echo "All services are healthy!"

# Clean up unused containers and images
echo "Cleaning up unused containers and images..."
docker container prune -f --filter "until=24h"
docker image prune -f --filter "until=24h"
docker system prune -f --filter "until=24h"

echo "Zero-downtime deployment completed successfully!"
echo "The application should be accessible at https://iesr.indonesiacentral.cloudapp.azure.com"
echo "Check logs with: docker-compose logs -f"