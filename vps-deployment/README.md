# Excel ETL Application - VPS Deployment (Fixed)

This is the fixed VPS deployment package for the Excel ETL application that resolves the issue where the frontend was not being served correctly.

## Problem That Was Fixed

The original VPS deployment had a critical issue:
- The backend server only served API endpoints and had no mechanism to serve frontend static files
- The frontend files existed in the `frontend/` directory but weren't accessible through any server
- This created a disconnect where users couldn't access the application frontend

## Solution Implemented

We modified the backend server to serve both API endpoints and frontend static files:

### Key Changes Made

1. **Enhanced Backend Server** (`backend/dist/src/config/app.js`):
   - Added `express.static()` middleware to serve files from the `frontend/` directory
   - Added a catch-all route handler that serves `index.html` for client-side routing while preserving API routes
   - Added proper imports for `path` and `fileURLToPath` modules

2. **Maintained Full API Compatibility**:
   - All existing API endpoints continue to work exactly as before
   - No breaking changes to the backend functionality

3. **Added Client-Side Routing Support**:
   - React Router and other client-side navigation now works properly
   - Non-API routes correctly serve `index.html` for SPA functionality

## How It Works Now

The application runs on a single server that:
1. Serves API endpoints under `/api`, `/v2`, `/fields`, `/auth`, and `/keys` paths
2. Serves static frontend files (HTML, CSS, JS) from the `frontend/` directory
3. Handles client-side routing by serving `index.html` for all non-API routes
4. Provides a seamless full-stack experience on a single port

## Deployment Instructions

1. **Extract the Package**:
   ```bash
   unzip excel-etl-fullstack-vps-deployment-fixed-final.zip -d excel-etl-app
   cd excel-etl-app
   ```

2. **Create Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your Azure configuration
   ```

3. **Start the Application**:
   ```bash
   ./start.sh
   ```

4. **Access the Application**:
   - Frontend: http://your-server-ip:3001
   - Backend API: http://your-server-ip:3001/api/...

## File Structure

```
excel-etl-app/
├── backend/           # Backend server files
│   └── dist/          # Compiled backend code
│       └── src/       # Source files
│           ├── config/     # Configuration files
│           ├── routes/     # API route handlers
│           ├── services/   # Business logic services
│           └── ...          # Other backend components
├── frontend/          # Built frontend files
│   ├── index.html     # Main HTML file
│   ├── assets/        # CSS, JS, and other assets
│   └── ...            # Other frontend files
├── .env               # Environment configuration
├── .env.example       # Example environment configuration
├── start.sh           # Startup script
└── ...                # Other deployment files
```

## No Installation Required

⚠️ **Important**: This is a ready-to-run deployment package. You do **NOT** need to run `npm install`.

The package includes:
- Pre-compiled backend JavaScript files with all dependencies
- Pre-built frontend static files (HTML, CSS, JS)
- All necessary runtime dependencies

Simply extract, configure, and run!

## Environment Configuration

Before starting the application, make sure to configure your environment variables in the `.env` file:

```bash
# Copy the example configuration
cp .env.example .env

# Edit the .env file with your Azure settings
nano .env
```

Required configuration includes:
- Azure AD Application (Client) ID
- Azure AD Directory (Tenant) ID
- Azure Cosmos DB Endpoint and Key
- Azure Storage Account settings

## Troubleshooting

If you encounter any issues:

1. **Check Logs**: Look at the console output when starting the application
2. **Verify Environment Variables**: Ensure all required variables are set in `.env`
3. **Check File Permissions**: Ensure the application has read access to all files
4. **Verify Ports**: Ensure port 3001 (or your configured port) is not blocked by firewall
5. **Check Process Status**: Use `ps aux | grep node` to verify the server is running

### Common Issues and Solutions

1. **Port Already In Use**:
   - Edit the `.env` file and change the `PORT` variable
   - Or stop the existing process: `lsof -i :3001` then `kill -9 <PID>`

2. **Permission Denied**:
   - Ensure the application files have proper read permissions
   - Run with appropriate user privileges

3. **Environment Variables Not Set**:
   - Double-check that all required variables are in the `.env` file
   - Ensure there are no syntax errors in the file

## Support

For additional support, refer to the main documentation or contact the development team.