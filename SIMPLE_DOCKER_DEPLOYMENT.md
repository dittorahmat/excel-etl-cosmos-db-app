# Excel to Cosmos DB Dashboard - Simple Docker Deployment

This guide explains how to deploy the Excel to Cosmos DB Dashboard application to a VPS using Docker without Easypanel.

## Prerequisites

1. A VPS with Docker and Docker Compose installed
2. Azure credentials for the required services

## Deployment Steps

### 1. Prepare Your Environment

First, ensure Docker and Docker Compose are installed on your VPS:

```bash
# Update package index
sudo apt update

# Install Docker
sudo apt install docker.io

# Install Docker Compose
sudo apt install docker-compose

# Add your user to the docker group (optional but recommended)
sudo usermod -aG docker $USER

# Log out and back in for the group changes to take effect
```

### 2. Prepare Your Application

Clone or copy your application files to your VPS:

```bash
# Clone the repository (or copy your files)
git clone <your-repo-url> excel-to-cosmos
cd excel-to-cosmos

# Create a .env file with your Azure credentials
cp .env.example .env
# Edit .env with your actual Azure credentials
nano .env
```

Make sure your `.env` file is in the same directory as `docker-compose.yml`. The docker-compose configuration will automatically load all environment variables from this file when starting the application.

### 3. Deploy Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up -d

# Check if the application is running
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Deploy Using Direct Docker Commands

If you prefer to use direct Docker commands:

```bash
# Build the image
docker build -t excel-to-cosmos -f Dockerfile.simple .

# Run the container
docker run -d \
  --name excel-to-cosmos \
  -p 80:3000 \
  --restart unless-stopped \
  excel-to-cosmos
```

### 5. Using the Deployment Script

You can also use the provided deployment script:

```bash
# Make it executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

## Environment Variables

Make sure to set all required environment variables in your `.env` file:

- Azure Cosmos DB credentials
- Azure Storage credentials
- Azure AD configuration
- Any other required settings

Refer to `.env.example` for all required variables.

The `.env` file should be placed in the same directory as `docker-compose.yml`. Docker Compose will automatically load all environment variables from this file when starting the application.

## Updating Dependencies

It's important to keep your application dependencies up to date for security and performance improvements.

### Automated Approach

Use the provided script to update dependencies:

```bash
# Make the script executable (if not already done)
chmod +x update-deps.sh

# Run the dependency update script
./update-deps.sh
```

### Manual Approach

See `DEPENDENCY_UPDATE_GUIDE.md` for detailed instructions on manually updating dependencies.

### After Updating Dependencies

After updating dependencies, you'll need to rebuild your Docker image:

```bash
# Rebuild and redeploy with updated dependencies
docker-compose up -d --build
```

## Updating the Application

When you have updates to your application, you'll need to rebuild the Docker image.

### 1. Pull the latest code
```bash
# If using git
git pull

# Or copy the updated files to your VPS
```

### 2. Rebuild and redeploy
```bash
# Using docker-compose (recommended)
docker-compose up -d --build

# This will:
# - Rebuild the Docker image with your updates
# - Stop the current container
# - Start a new container with the updated image
```

### 3. Alternative manual approach
```bash
# Build the new image
docker build -t excel-to-cosmos -f Dockerfile.simple .

# Stop and remove the current container
docker stop excel-to-cosmos
docker rm excel-to-cosmos

# Run the new container
docker run -d \
  --name excel-to-cosmos \
  -p 80:3000 \
  --restart unless-stopped \
  excel-to-cosmos
```

### What Triggers a Rebuild

You'll need to rebuild when you change:
- Source code (frontend or backend)
- Dependencies in package.json
- Dockerfile configuration
- Environment variables that affect the build

### Zero-Downtime Deployment Option

For production environments where you want to minimize downtime:

```bash
# Build the new image
docker-compose build

# Stop and remove the old container
docker-compose stop
docker-compose rm -f

# Start the new container
docker-compose up -d
```

### Quick Check After Update

After updating, verify the deployment:
```bash
# Check if the container is running
docker-compose ps

# Check logs for any errors
docker-compose logs

# Test the application
curl -I http://localhost
```

The `--build` flag in docker-compose is the simplest approach as it handles the entire process automatically. Your data and logs will persist through updates since they're stored in Docker volumes.

## Accessing the Application

After deployment, the application will be accessible at:

```
https://your-vps-ip
```

HTTP requests to `http://your-vps-ip` will automatically redirect to HTTPS.

Note: Since the application uses self-signed certificates, your browser will show a security warning. This is expected for the default setup. To proceed:
1. Navigate to https://your-vps-ip
2. Click "Advanced" 
3. Click "Proceed to [IP] (unsafe)"

For production use with a domain name, refer to `HTTPS_SETUP.md` for instructions on setting up trusted certificates with Let's Encrypt.

## Managing the Application

### View logs
```bash
docker-compose logs -f
```

### Stop the application
```bash
docker-compose down
```

### Update the application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Backup and Restore
Remember to backup your:
1. `.env` file with credentials
2. Any persistent data (if applicable)

## Troubleshooting

### Check if containers are running
```bash
docker-compose ps
```

### Check logs for errors
```bash
docker-compose logs
```

### Check if ports are available
```bash
sudo netstat -tlnp | grep :80
```