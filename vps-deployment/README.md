# Excel ETL Application - VPS Deployment

This directory contains the built application ready for deployment to a VPS.

## Build Information
- Build Version: 20250818-115449
- Build Timestamp: Mon Aug 18 11:54:49 AM WIB 2025

## Contents
- `frontend/` - Built React frontend application
- `backend/` - Built Node.js backend application
- `package.json` - Deployment package configuration
- `.env` - Environment configuration (not included, must be created separately)
- `start.sh` - Startup script
- `ecosystem.config.cjs` - PM2 configuration

## Deployment Instructions

1. Copy this entire directory to your VPS
2. Install dependencies: `npm install`
3. Create a `.env` file with your configuration
4. Start the application: `npm start`

## Build Script
This package was created using the automated build script (`build.sh`).
