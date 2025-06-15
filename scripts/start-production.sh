#!/bin/bash

# Set production environment variables
export VITE_API_BASE_URL=https://excel-etl-backend-378680.azurewebsites.net
export VITE_AZURE_AD_CLIENT_ID=your-client-id
export VITE_AZURE_AD_TENANT_ID=your-tenant-id
export VITE_AZURE_AD_REDIRECT_URI=http://localhost:3000
export VITE_AZURE_AD_SCOPES="User.Read openid profile email"

# Start the development server with production environment variables
npm run dev
