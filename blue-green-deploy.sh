#!/bin/bash

# Blue-Green Deployment Script for Excel to Cosmos DB Dashboard
# Implements true blue-green deployment pattern for zero downtime

set -e

echo "=== Blue-Green Deployment for Excel to Cosmos DB Dashboard ==="

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
BLUE_ENV="${APP_NAME}-blue"
GREEN_ENV="${APP_NAME}-green"
LIVE_ENV_FILE="/opt/${APP_NAME}/live-env"

# Function to get current live environment
get_live_environment() {
    if [ -f "$LIVE_ENV_FILE" ]; then
        cat "$LIVE_ENV_FILE"
    else
        echo "$BLUE_ENV"  # Default to blue for first deployment
    fi
}

# Function to get next environment (opposite of current)
get_next_environment() {
    local current=$(get_live_environment)
    if [ "$current" = "$BLUE_ENV" ]; then
        echo "$GREEN_ENV"
    else
        echo "$BLUE_ENV"
    fi
}

# Determine current and next environments
CURRENT_ENV=$(get_live_environment)
NEXT_ENV=$(get_next_environment)

echo "Current live environment: $CURRENT_ENV"
echo "Deploying to: $NEXT_ENV"

# Create directory for the next environment
echo "Creating deployment directory at /opt/${NEXT_ENV}"
sudo mkdir -p "/opt/${NEXT_ENV}"
sudo chown $USER:$USER "/opt/${NEXT_ENV}"

# Copy files to the next environment directory
echo "Copying application files to /opt/${NEXT_ENV}..."
# Use rsync to preserve permissions and only copy changed files
rsync -av --exclude='node_modules' --exclude='.git' --exclude='logs' ./ "/opt/${NEXT_ENV}/"

# Copy .env file if it exists
if [ -f ".env" ]; then
    cp .env "/opt/${NEXT_ENV}/"
else
    echo "No .env file found. Remember to create one with your Azure credentials."
fi

# Navigate to the next environment directory
cd "/opt/${NEXT_ENV}"

# Create logs directory
mkdir -p logs

# Build the new images
echo "Building new images..."
docker-compose build

# Deploy the next environment
echo "Deploying next environment: ${NEXT_ENV}..."
docker-compose -p "${NEXT_ENV}" up -d

# Wait for next environment services to be healthy
echo "Waiting for ${NEXT_ENV} services to be healthy..."
HEALTHY=false
RETRIES=30
SLEEP_INTERVAL=10

for i in $(seq 1 $RETRIES); do
    if docker-compose -p "${NEXT_ENV}" ps | grep -q "(healthy)"; then
        HEALTHY=true
        break
    fi
    echo "Waiting for ${NEXT_ENV} services to be healthy... ($i/$RETRIES)"
    sleep $SLEEP_INTERVAL
done

if [ "$HEALTHY" = false ]; then
    echo "ERROR: ${NEXT_ENV} services did not become healthy in time. Rolling back..."
    docker-compose -p "${NEXT_ENV}" down -v
    exit 1
fi

echo "${NEXT_ENV} services are healthy!"

# Test the next environment
echo "Testing ${NEXT_ENV} environment..."
# Test that we can reach the health endpoint
if curl -k --fail https://localhost:8443/health &>/dev/null; then
    echo "${NEXT_ENV} environment is responding correctly"
else
    echo "ERROR: ${NEXT_ENV} environment is not responding correctly. Rolling back..."
    docker-compose -p "${NEXT_ENV}" down -v
    exit 1
fi

# Switch traffic to the next environment
echo "Switching traffic to ${NEXT_ENV}..."
# In a real implementation, this would involve updating a load balancer,
# changing DNS records, or updating a reverse proxy configuration.

# For this example, we'll simulate the switch by updating the live-env file
echo "$NEXT_ENV" | sudo tee "$LIVE_ENV_FILE" > /dev/null

# Stop the old environment after confirming the new one is working
echo "Stopping old environment: ${CURRENT_ENV}..."
docker-compose -p "${CURRENT_ENV}" down -v

# Clean up unused containers and images
echo "Cleaning up unused containers and images..."
docker container prune -f --filter "until=24h"
docker image prune -f --filter "until=24h"
docker system prune -f --filter "until=24h"

echo "Blue-Green deployment completed successfully!"
echo "The application should be accessible at https://iesr.indonesiacentral.cloudapp.azure.com"
echo "Check logs with: docker-compose -p ${NEXT_ENV} logs -f"