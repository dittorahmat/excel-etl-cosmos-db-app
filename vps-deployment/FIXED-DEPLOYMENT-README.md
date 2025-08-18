# Excel ETL Application - Fixed VPS Deployment

This is a fixed version of the Excel ETL application VPS deployment package that addresses the issue where the frontend was not being served correctly.

## Changes Made

1. **Modified Backend Server**: The backend server (`backend/dist/src/config/app.js`) has been updated to:
   - Serve static frontend files from the `frontend/` directory
   - Handle client-side routing by serving `index.html` for all non-API routes
   - Properly integrate frontend and backend on the same server

2. **Added Required Imports**: Added `path` and `fileURLToPath` imports to support static file serving

3. **Added Static File Middleware**: Added `express.static()` middleware to serve files from the frontend directory

4. **Added Catch-All Route Handler**: Added a catch-all route that serves `index.html` for client-side routing while preserving API routes

## How It Works

The application now runs on a single server that:
1. Serves API endpoints under `/api`, `/v2`, `/fields`, `/auth`, and `/keys` paths
2. Serves static frontend files (HTML, CSS, JS) from the `frontend/` directory
3. Handles client-side routing by serving `index.html` for all non-API routes

## Deployment Instructions

1. **Extract the Package**:
   ```bash
   unzip excel-etl-fullstack-vps-deployment-fixed.zip -d excel-etl-app
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
├── frontend/          # Built frontend files
│   ├── index.html     # Main HTML file
│   ├── assets/        # CSS, JS, and other assets
│   └── ...            # Other frontend files
├── .env               # Environment configuration
├── start.sh           # Startup script
└── ...                # Other deployment files
```

## Troubleshooting

If you encounter any issues:

1. **Check Logs**: Look at the console output when starting the application
2. **Verify Environment Variables**: Ensure all required variables are set in `.env`
3. **Check File Permissions**: Ensure the application has read access to all files
4. **Verify Ports**: Ensure port 3001 (or your configured port) is not blocked by firewall

## Support

For additional support, refer to the main documentation or contact the development team.