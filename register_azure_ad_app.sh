#!/bin/bash

# Azure AD App Registration Script
# This script automates the registration of an Azure AD application for authentication

# Load environment variables from .env file
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo ".env file not found. Please make sure it exists."
    exit 1
fi

# Set variables from environment or use defaults
APP_NAME="${APP_NAME:-Excel ETL App}"
REPLY_URL="${REPLY_URL:-http://localhost:3000}"
API_SCOPE="${API_SCOPE:-api://${AZURE_FUNCTION_APP}.azurewebsites.net/access_as_user}"

# Check if Azure CLI is logged in
if ! az account show &>/dev/null; then
    echo "Please log in to Azure CLI using 'az login'"
    exit 1
fi

# Get tenant ID if not set
if [ -z "$AZURE_TENANT_ID" ]; then
    AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)
fi

# Register the application
echo "Registering Azure AD application: $APP_NAME..."
app_registration=$(az ad app create \
    --display-name "$APP_NAME" \
    --sign-in-audience "AzureADMyOrg" \
    --web-redirect-uris "$REPLY_URL" \
    --enable-id-token-issuance true \
    --query "{appId:appId, objectId:id}" \
    -o json)

# Extract app ID and object ID
APP_ID=$(echo $app_registration | jq -r '.appId')
OBJECT_ID=$(echo $app_registration | jq -r '.objectId')

echo "✅ Application registered with ID: $APP_ID"

# Add SPA platform configuration for the frontend
echo "Configuring SPA platform..."
az ad app update \
    --id $APP_ID \
    --set "spa={\"redirectUris\":[\"$REPLY_URL\"]}"

# Create a service principal for the application
echo "Creating service principal..."
az ad sp create --id $APP_ID

# Create a client secret
echo "Creating client secret..."
# Secret expires in 1 year
secret=$(az ad app credential reset \
    --id $APP_ID \
    --years 1 \
    --query "password" \
    -o tsv)

# Configure API permissions
echo "Configuring API permissions..."

# Microsoft Graph User.Read (for user profile)
az ad app permission add \
    --id $APP_ID \
    --api 00000003-0000-0000-c000-000000000000 \
    --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope

# Output the configuration
echo -e "\n✅ Azure AD Application Registration Complete"
echo "========================================"
echo "Application Name:    $APP_NAME"
echo "Application ID:      $APP_ID"
echo "Tenant ID:          $AZURE_TENANT_ID"
echo "Redirect URI:        $REPLY_URL"
echo ""
echo "📝 Add these values to your .env file:"
echo "========================================"
echo "VITE_AZURE_CLIENT_ID=$APP_ID"
echo "VITE_AZURE_TENANT_ID=$AZURE_TENANT_ID"
echo "VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/$AZURE_TENANT_ID"
echo "VITE_API_SCOPE=$API_SCOPE"
echo ""
echo "🔑 Client Secret (save this securely, it won't be shown again):"
echo "$secret"
echo ""
echo "⚠️  Important: Save the client secret in a secure location as it won't be shown again."
echo "You'll need to add it to your application's configuration."

# Create a backup of the .env file
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d%H%M%S)
    echo "\n🔒 Created backup of .env file"
fi

# Update .env file with new values
echo "Updating .env file with new values..."
# Remove existing Azure AD settings
grep -vE '^VITE_AZURE_' .env > .env.tmp
# Add new settings
echo "# Azure AD Authentication" >> .env.tmp
echo "VITE_AZURE_CLIENT_ID=$APP_ID" >> .env.tmp
echo "VITE_AZURE_TENANT_ID=$AZURE_TENANT_ID" >> .env.tmp
echo "VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/$AZURE_TENANT_ID" >> .env.tmp
echo "VITE_API_SCOPE=$API_SCOPE" >> .env.tmp

# Preserve other settings
mv .env.tmp .env

echo "\n✅ .env file has been updated with the new Azure AD settings."
echo "🔐 Don't forget to store the client secret in your application's secure configuration!"
