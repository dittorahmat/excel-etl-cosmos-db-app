# Deployment Guide

This guide provides instructions for deploying the Excel to Cosmos DB Dashboard application using various methods.

## Deployment Options

This application supports multiple deployment methods:

1. **EasyPanel Deployment** (Recommended) - See `EASYPANEL_DEPLOYMENT_UPDATED.md` for detailed instructions
2. **Docker Deployment** - See `Dockerfile` for container configuration
3. **Azure Static Web Apps** - See `staticwebapp.config.json` for configuration
4. **Manual Deployment** - Follow the instructions in `EASYPANEL_DEPLOYMENT_UPDATED.md` but adapt for your environment

## EasyPanel Deployment (Primary Method)

For EasyPanel deployment, please refer to the detailed guide in `EASYPANEL_DEPLOYMENT_UPDATED.md` which includes:

- Prerequisites
- Environment variable configuration
- Build and start commands
- Deployment scripts (`build-for-easypanel.sh` and `start-for-easypanel.sh`)
- Nixpacks configuration (`nixpacks.toml`)
- Troubleshooting tips

## Docker Deployment

For Docker deployment, refer to the `Dockerfile` which provides a multi-stage build process.

## Azure Static Web Apps

For Azure Static Web Apps deployment, refer to the `staticwebapp.config.json` file which contains the necessary configuration.

## Deployment Scripts

The following scripts are provided for EasyPanel deployment:
- `build-for-easypanel.sh` - Build script with retry mechanisms
- `start-for-easypanel.sh` - Start script with improved file discovery

## Configuration Files

- `nixpacks.toml` - Nixpacks configuration for EasyPanel deployment
- `staticwebapp.config.json` - Azure Static Web Apps configuration
- `staticwebapp.mock.config.json` - Mock configuration for local development