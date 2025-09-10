# Zero-Downtime Deployment Guide

This guide explains how to deploy the Excel to Cosmos DB Dashboard application with zero downtime using Docker Compose.

## How It Works

The deployment uses Docker Compose's built-in rolling update capabilities with health checks to ensure zero downtime:

1. Health checks are configured for both services to verify they're running correctly
2. Rolling updates are configured to update one service at a time
3. Automatic rollback is configured if updates fail
4. Unused containers and images are cleaned up after deployment

## Deployment Process

### 1. Prerequisites

Ensure you have:
- Docker installed
- Docker Compose installed
- Proper `.env` file with your Azure credentials

### 2. Deploying with Zero Downtime

Run the deployment script:

```bash
./improved-zero-downtime-deploy.sh
```

This script will:
1. Build new Docker images
2. Deploy using rolling updates to maintain uptime
3. Clean up unused containers and images
4. Verify deployment success

### 3. Manual Deployment

If you prefer to deploy manually, you can use:

```bash
# Build and deploy with rolling updates
docker-compose up -d --build --remove-orphans

# Clean up unused resources
docker container prune -f --filter "until=24h"
docker image prune -f --filter "until=24h"
docker system prune -f --filter "until=24h"
```

## Configuration Details

### Health Checks

Both services have health checks configured:
- `excel-to-cosmos`: Checks the `/health` endpoint
- `nginx`: Verifies the server is responding

### Rolling Update Configuration

The deployment configuration includes:
- Parallelism: 1 (update one container at a time)
- Delay: 10s (wait between updates)
- Failure action: rollback (automatically rollback on failure)
- Monitor: 60s (monitor for failures after update)
- Max failure ratio: 0.3 (allow up to 30% failures)

### Cleanup

The deployment automatically cleans up:
- Containers unused for more than 24 hours
- Images unused for more than 24 hours
- Other unused Docker resources