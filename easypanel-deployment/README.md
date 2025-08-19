# Excel ETL Application - Deployment Packages

This directory contains the deployment package for EasyPanel.

## Deployment Package

### `excel-etl-easypanel-deployment.zip` 
- **Purpose**: Deployment package specifically designed for EasyPanel with Nixpacks
- **Contents**: Source code that will be built during deployment
- **Use Case**: EasyPanel deployments with Nixpacks build process
- **Configuration**: 
  - Install Command: `npm install`
  - Build Command: `npm run build`  
  - Start Command: `npm start`

## Instructions

1. Upload `excel-etl-easypanel-deployment.zip` to EasyPanel
2. Configure Nixpacks settings as described above
3. Set environment variables in EasyPanel's Environment section
4. Deploy the application

Do NOT use any other deployment packages for EasyPanel - they are designed for different deployment environments.