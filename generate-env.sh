#!/bin/bash
# This script generates the .env file in the deploy_output directory
# It uses the environment variables set in EasyPanel

# Create the deploy_output directory if it doesn't exist
mkdir -p deploy_output

# Create or overwrite the .env file
echo "# Auto-generated .env file" > deploy_output/.env

# List of expected environment variables (add any additional ones you need)
ENV_VARS=(
  "NODE_ENV"
  "PORT"
  "MONGODB_URI"
  "AZURE_STORAGE_CONNECTION_STRING"
  "AZURE_STORAGE_CONTAINER_NAME"
  "AZURE_AD_CLIENT_ID"
  "AZURE_AD_CLIENT_SECRET"
  "AZURE_AD_TENANT_ID"
  "AZURE_AD_REDIRECT_URI"
  "SESSION_SECRET"
  "API_BASE_URL"
)

# Write each environment variable to the .env file
for var in "${ENV_VARS[@]}"; do
  if [ -n "${!var}" ]; then
    echo "${var}=${!var}" >> deploy_output/.env
  fi
done

echo "Generated .env file in deploy_output directory"
ls -la deploy_output/
