# Excel ETL Application - VPS Deployment

This directory contains the built application ready for deployment to a VPS.

## Build Information
- Build Version: 20250818-130304
- Build Timestamp: Mon Aug 18 01:03:04 PM WIB 2025

## Contents
- `frontend/` - Built React frontend application
- `backend/` - Built Node.js backend application
- `package.json` - Deployment package configuration
- `.env` - Environment configuration (not included, must be created separately)
- `start.sh` - Startup script
- `ecosystem.config.cjs` - PM2 configuration
- `Dockerfile` - Docker configuration
- `docker-compose.yml` - Docker Compose configuration
- `DOCKER-README.md` - Docker deployment instructions

## Deployment Instructions

### Option 1: Traditional Deployment
1. Copy this entire directory to your VPS
2. Install dependencies: `npm install`
3. Create a `.env` file with your configuration
4. Start the application: `npm start`

### Option 2: Docker Deployment
1. Copy this entire directory to your VPS
2. Create a `.env` file with your configuration
3. Build and run with Docker Compose: `docker-compose up -d`

## Build Script
This package was created using the automated build script (`build.sh`).
