# Excel ETL Application - VPS Deployment Package

This directory contains a complete deployment package for the Excel ETL application, with both frontend and backend components ready for deployment to a Virtual Private Server (VPS).

## 📋 Package Contents

### Directories
- `frontend/` - Built React application with all static assets
- `backend/` - Built Node.js server application with compiled JavaScript
- `logs/` - Directory for application logs

### Scripts
- `build.sh` - Automated build script to recreate the deployment package
- `start.sh` - Simple startup script for the application
- `create-deployment.sh` - Complete deployment package creation and verification
- `test-deployment.sh` - Verifies deployment package structure
- `final-verification.sh` - Comprehensive package validation
- `test-build.sh` - Simple test wrapper for build script

### Configuration Files
- `package.json` - Main deployment configuration with start scripts
- `ecosystem.config.cjs` - PM2 process manager configuration
- `.env` - Template environment configuration file
- `VERSION` - Package creation timestamp

### Documentation
- `README.md` - Comprehensive deployment guide
- `QUICK-DEPLOY.md` - Simplified deployment reference
- `DEPLOYMENT-SUMMARY.md` - Summary of package creation
- `FILE-LIST.md` - Complete file listing with sizes

## 🚀 Quick Start

1. **Transfer this entire directory to your VPS**
   ```bash
   scp -r vps-deployment user@your-vps-ip:/home/user/
   ```

2. **SSH into your VPS**
   ```bash
   ssh user@your-vps-ip
   ```

3. **Navigate to the deployment directory**
   ```bash
   cd /home/user/vps-deployment
   ```

4. **Install production dependencies**
   ```bash
   npm install --production
   ```

5. **Customize the environment configuration**
   ```bash
   nano .env
   ```
   Update the values with your Azure credentials and configuration.

6. **Start the application**
   ```bash
   npm start
   ```

7. **Access the application**
   - Frontend: `http://your-vps-ip:3001/`
   - Backend API: `http://your-vps-ip:3001/api/v1/`

## 🛠️ Deployment with Process Manager (PM2)

For production use, it's recommended to use PM2:

1. **Install PM2 globally**
   ```bash
   sudo npm install -g pm2
   ```

2. **Start the application with PM2**
   ```bash
   pm2 start ecosystem.config.cjs
   ```

3. **Save the PM2 configuration**
   ```bash
   pm2 save
   ```

4. **Set PM2 to start on boot**
   ```bash
   pm2 startup
   ```
   Follow the instructions provided by the command.

## 🔧 Updating the Application

To rebuild the application with the latest changes:

1. **Run the build script**
   ```bash
   ./build.sh
   ```

2. **Restart the application**
   ```bash
   pm2 restart excel-etl-app
   ```
   or if using npm start:
   ```bash
   # Stop current instance (Ctrl+C if running in foreground)
   # Then start again
   npm start
   ```

## 📖 Documentation

- For detailed deployment instructions, see `README.md`
- For a quick deployment reference, see `QUICK-DEPLOY.md`
- For a summary of how this package was created, see `DEPLOYMENT-SUMMARY.md`
- For a complete file listing, see `FILE-LIST.md`

## 🆘 Troubleshooting

- If the application fails to start, check the logs:
  ```bash
  pm2 logs
  ```
  or check the log files in the `logs/` directory.

- Ensure all environment variables are correctly set in the `.env` file.

- Verify that the required ports are open in your firewall.

- Check that your Azure credentials are correct and have the necessary permissions.

## 📞 Support

For issues with the deployment package, refer to the documentation files included in this directory. For issues with the application itself, please check the main project repository.