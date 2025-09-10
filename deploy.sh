#!/bin/bash

# Simple deployment script for Excel to Cosmos DB Dashboard

# Exit on any error
set -e

echo "=== Excel to Cosmos DB Dashboard Deployment ==="

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

# NOTE: For zero-downtime deployments, use the zero-downtime-deploy.sh script instead
echo "NOTE: For zero-downtime deployments, consider using ./zero-downtime-deploy.sh"

# Create a directory for the application
APP_DIR="/opt/excel-to-cosmos"
echo "Creating application directory at $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy files to the application directory
echo "Copying application files..."
cp -r ./* $APP_DIR/
cp .env $APP_DIR/ 2>/dev/null || echo "No .env file found. Remember to create one with your Azure credentials."

# Navigate to the application directory
cd $APP_DIR

# Create logs directory
mkdir -p logs

# Build and start the application
echo "Building and starting the application..."
docker-compose up -d

# Check if the application is running
echo "Checking application status..."
docker-compose ps

echo "Deployment completed!"
echo "The application should be accessible at https://iesr.indonesiacentral.cloudapp.azure.com"
echo "For zero-downtime deployments, use: ./zero-downtime-deploy.sh"
echo "Check logs with: docker-compose logs -f"