# Excel to Cosmos DB Dashboard - Deployment Options

This project can be deployed in multiple ways, all with built-in HTTPS support.

## 1. Simple Docker Deployment (Recommended for VPS)

For deploying to a VPS without Easypanel, use the files in this directory:

- `Dockerfile.simple` - A simplified Dockerfile for standard deployments
- `docker-compose.yml` - Docker Compose configuration
- `start.sh` - Simple start script
- `deploy.sh` - Deployment script
- `SIMPLE_DOCKER_DEPLOYMENT.md` - Detailed deployment instructions

### Quick Start:
```bash
docker-compose up -d
```

## 2. Easypanel Deployment

The original files are still available for Easypanel deployments:

- `Dockerfile` - Multi-stage Dockerfile (modified to use start.sh)
- `start-for-easypanel.sh` - Easypanel-specific start script

## 3. Traditional Deployment

You can also run the application directly with Node.js:

```bash
npm install
cd server && npm install && cd ..
npm run build
npm run start
```

See `SIMPLE_DOCKER_DEPLOYMENT.md` for detailed instructions on deploying to a VPS.