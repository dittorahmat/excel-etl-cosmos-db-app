# Simplified Docker Deployment

This directory contains a simplified deployment configuration for the Excel to Cosmos DB Dashboard application.

## Files

- `docker-compose.simple.yml` - A simplified docker-compose configuration that runs only the application service without nginx
- `start-simple.sh` - A simplified start script that runs the application directly
- `Dockerfile.simple` - The Dockerfile that builds the application image

## Usage

To deploy using the simplified configuration:

```bash
# Copy the simplified docker-compose file
cp docker-compose.simple.yml docker-compose.yml

# Build and start the application
docker-compose up -d
```

The application will be available at http://localhost:3000

## Differences from the full deployment

1. No nginx reverse proxy
2. No HTTPS termination (handle HTTPS at the load balancer or cloud provider level)
3. Simpler configuration with fewer moving parts
4. Direct access to the application on port 3000

## When to use this deployment

Use this simplified deployment when:
- You're deploying to a cloud platform that handles load balancing and HTTPS (like Azure App Service, AWS ECS, etc.)
- You want a simpler setup for development or testing
- You're using a Kubernetes ingress controller or similar technology
- You prefer to handle SSL termination at the infrastructure level