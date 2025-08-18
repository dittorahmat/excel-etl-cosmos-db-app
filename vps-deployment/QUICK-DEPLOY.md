# Excel ETL Application - Quick Deployment Guide

This guide provides a quick reference for deploying the Excel ETL application to a VPS.

## Prerequisites

- Ubuntu 20.04 LTS or later VPS
- At least 2GB RAM and 20GB disk space
- Root or sudo access

## 1. Transfer Deployment Package

Transfer the entire `vps-deployment` directory to your VPS:

```bash
# On your local machine
scp -r vps-deployment user@your-vps-ip:/home/user/

# Or using rsync for better performance
rsync -avz vps-deployment/ user@your-vps-ip:/home/user/vps-deployment/
```

## 2. Connect to Your VPS

```bash
ssh user@your-vps-ip
```

## 3. Install Node.js (if not already installed)

```bash
# Update package list
sudo apt update

# Install Node.js (version 16 or higher)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

## 4. Navigate to Deployment Directory

```bash
cd /home/user/vps-deployment
```

## 5. Install Dependencies

```bash
npm install --production
```

## 6. Create Environment Configuration

Create a `.env` file with your configuration:

```bash
nano .env
```

Add the following content (adjust values to match your Azure resources):

```env
# Port configuration
PORT=3001

# Azure Cosmos DB configuration
AZURE_COSMOS_ENDPOINT=https://your-cosmos-account.documents.azure.com:443/
AZURE_COSMOS_KEY=your-primary-or-secondary-key
AZURE_COSMOS_DATABASE=excel-data
AZURE_COSMOS_CONTAINER=excel-records
AZURE_COSMOS_PARTITION_KEY=id

# Azure Storage configuration
AZURE_STORAGE_ACCOUNT=your-storage-account
AZURE_STORAGE_KEY=your-storage-account-key
AZURE_STORAGE_CONTAINER=excel-uploads

# Application configuration
NODE_ENV=production
API_PREFIX=/api/v1
AUTH_ENABLED=false

# Optional rate limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

Save and exit (Ctrl+X, then Y, then Enter).

## 7. Test the Application

Before running in production, test the application:

```bash
npm start
```

Check that it starts without errors, then stop it with Ctrl+C.

## 8. Set Up Process Manager (PM2)

For production use, install and use PM2:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application with PM2
pm2 start ecosystem.config.cjs

# Save the PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

Follow the instructions from `pm2 startup` to complete the setup.

## 9. Set Up Firewall (if using UFW)

```bash
# Allow SSH (if not already allowed)
sudo ufw allow ssh

# Allow the application port
sudo ufw allow 3001

# Enable firewall (if not already enabled)
sudo ufw enable
```

## 10. Access the Application

The application should now be accessible at:

- Backend API: `http://your-vps-ip:3001/api/v1/`
- Frontend: `http://your-vps-ip:3001/`

## Useful PM2 Commands

```bash
# View application status
pm2 status

# View application logs
pm2 logs

# Restart the application
pm2 restart excel-etl-app

# Stop the application
pm2 stop excel-etl-app

# Monitor resource usage
pm2 monit
```

## Updating the Application

To update the application:

1. Transfer the new `vps-deployment` directory to your VPS
2. Stop the current application:
   ```bash
   pm2 stop excel-etl-app
   ```
3. Replace the files or deploy to a new directory
4. Install any new dependencies:
   ```bash
   npm install --production
   ```
5. Restart the application:
   ```bash
   pm2 start ecosystem.config.cjs
   ```
   or if already configured:
   ```bash
   pm2 restart excel-etl-app
   ```

## Troubleshooting

- If the application fails to start, check the logs:
  ```bash
  pm2 logs
  ```

- Ensure all environment variables are correctly set in the `.env` file

- Verify that the required ports are open in your firewall

- Check that your Azure credentials are correct and have the necessary permissions

- If you see module not found errors, try:
  ```bash
  rm -rf node_modules
  npm install --production
  ```

## Support

For additional help, refer to the full documentation in the `README.md` file included in this deployment package.