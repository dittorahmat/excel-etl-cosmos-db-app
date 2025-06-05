#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Environment Variables for Naming Consistency ---
# It's recommended to set these in your shell environment before running the script,
# or uncomment and modify them here for quick testing.
# export RESOURCE_GROUP_NAME="my-excel-etl-rg"
# export LOCATION="eastus" # Or your preferred Azure region
# export COSMOSDB_ACCOUNT_NAME="myexceletlcosmosdb$(head /dev/urandom | tr -dc a-z0-9 | head -c 8)" # Unique name
# export STORAGE_ACCOUNT_NAME="myexceletlstg$(head /dev/urandom | tr -dc a-z0-9 | head -c 8)" # Unique name
# export FUNCTION_APP_NAME="myexceletlfunc$(head /dev/urandom | tr -dc a-z0-9 | head -c 8)" # Unique name

# Check if environment variables are set
if [ -z "$RESOURCE_GROUP_NAME" ]; then
    echo "Error: RESOURCE_GROUP_NAME environment variable is not set."
    exit 1
fi
if [ -z "$LOCATION" ]; then
    echo "Error: LOCATION environment variable is not set."
    exit 1
fi
if [ -z "$COSMOSDB_ACCOUNT_NAME" ]; then
    echo "Error: COSMOSDB_ACCOUNT_NAME environment variable is not set."
    exit 1
fi
if [ -z "$STORAGE_ACCOUNT_NAME" ]; then
    echo "Error: STORAGE_ACCOUNT_NAME environment variable is not set."
    exit 1
fi
if [ -z "$FUNCTION_APP_NAME" ]; then
    echo "Error: FUNCTION_APP_NAME environment variable is not set."
    exit 1
fi

echo "--- Provisioning Azure Resources ---"
echo "Resource Group: $RESOURCE_GROUP_NAME"
echo "Location: $LOCATION"
echo "Cosmos DB Account: $COSMOSDB_ACCOUNT_NAME"
echo "Storage Account: $STORAGE_ACCOUNT_NAME"
echo "Function App: $FUNCTION_APP_NAME"
echo "------------------------------------"

# --- 1. Create Resource Group ---
echo "Attempting to create resource group: $RESOURCE_GROUP_NAME in $LOCATION..."
if az group show --name "$RESOURCE_GROUP_NAME" &>/dev/null; then
    echo "Resource group '$RESOURCE_GROUP_NAME' already exists. Skipping creation."
else
    az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION" --output none
    echo "Resource group '$RESOURCE_GROUP_NAME' created successfully."
fi

# --- 2. Create Cosmos DB (serverless, 400 RU) ---
echo "Attempting to create Cosmos DB account: $COSMOSDB_ACCOUNT_NAME..."
if az cosmosdb show --name "$COSMOSDB_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP_NAME" &>/dev/null; then
    echo "Cosmos DB account '$COSMOSDB_ACCOUNT_NAME' already exists. Skipping creation."
else
    az cosmosdb create \
        --name "$COSMOSDB_ACCOUNT_NAME" \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --locations regionName="$LOCATION" failoverPriority=0 \
        --default-consistency-level Session \
        --server-version 4.0 \
        --capabilities EnableServerless \
        --output none
    echo "Cosmos DB account '$COSMOSDB_ACCOUNT_NAME' created successfully (Serverless, 400 RU)."
fi

# --- 3. Create Blob Storage (standard, LRS) ---
echo "Attempting to create Storage Account: $STORAGE_ACCOUNT_NAME..."
if az storage account show --name "$STORAGE_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP_NAME" &>/dev/null; then
    echo "Storage account '$STORAGE_ACCOUNT_NAME' already exists. Skipping creation."
else
    az storage account create \
        --name "$STORAGE_ACCOUNT_NAME" \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --location "$LOCATION" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --output none
    echo "Storage account '$STORAGE_ACCOUNT_NAME' created successfully (Standard, LRS)."
fi

# --- 4. Create Function App (Linux Free Tier) ---
echo "Attempting to create Function App: $FUNCTION_APP_NAME..."
# Check if the Function App already exists
if az functionapp show --name "$FUNCTION_APP_NAME" --resource-group "$RESOURCE_GROUP_NAME" &>/dev/null; then
    echo "Function App '$FUNCTION_APP_NAME' already exists. Skipping creation."
else
    # Create an App Service Plan for the Function App (Linux, Free Tier)
    APP_SERVICE_PLAN_NAME="${FUNCTION_APP_NAME}-plan"
    echo "Creating App Service Plan: $APP_SERVICE_PLAN_NAME..."
    az appservice plan create \
        --name "$APP_SERVICE_PLAN_NAME" \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --location "$LOCATION" \
        --is-linux \
        --sku B1 \
        --output none
    echo "App Service Plan '$APP_SERVICE_PLAN_NAME' created successfully."

    # Create the Function App
    az functionapp create \
        --name "$FUNCTION_APP_NAME" \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --consumption-plan-location "$LOCATION" \
        --runtime node \
        --runtime-version 18 \
        --functions-version 4 \
        --storage-account "$STORAGE_ACCOUNT_NAME" \
        --app-service-plan "$APP_SERVICE_PLAN_NAME" \
        --output none
    echo "Function App '$FUNCTION_APP_NAME' created successfully (Linux Free Tier)."
fi

echo "--- Azure Resource Provisioning Complete ---"
echo "You can now configure your application to use these resources."