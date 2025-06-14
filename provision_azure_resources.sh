#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Load environment variables from .env file
if [ -f ".env" ]; then
    echo "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found. Please create one from .env.example"
    exit 1
fi

# Set default values if not provided in .env
AZURE_RESOURCE_GROUP=${AZURE_RESOURCE_GROUP:-my-excel-etl-rg}
AZURE_LOCATION=${AZURE_LOCATION:-eastus}
AZURE_COSMOSDB_ACCOUNT=${AZURE_COSMOSDB_ACCOUNT:-exceletlcosmos-$(head /dev/urandom | tr -dc 'a-z0-9' | head -c 8)}
AZURE_STORAGE_ACCOUNT=${AZURE_STORAGE_ACCOUNT:-exceletlstg$(head /dev/urandom | tr -dc 'a-z0-9' | head -c 8)}
AZURE_FUNCTION_APP=${AZURE_FUNCTION_APP:-exceletlfunc-$(head /dev/urandom | tr -dc 'a-z0-9' | head -c 8)}
AZURE_COSMOS_DATABASE=${AZURE_COSMOS_DATABASE:-excel-data}
AZURE_COSMOS_CONTAINER=${AZURE_COSMOS_CONTAINER:-records}
AZURE_STORAGE_CONTAINER=${AZURE_STORAGE_CONTAINER:-excel-uploads}

# Validate required environment variables
required_vars=(
    "AZURE_RESOURCE_GROUP"
    "AZURE_LOCATION"
    "AZURE_COSMOSDB_ACCOUNT"
    "AZURE_STORAGE_ACCOUNT"
    "AZURE_FUNCTION_APP"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "Error: $var is not set in .env file"
        exit 1
    fi
done

echo "--- Provisioning Azure Resources ---"
echo "Resource Group: $AZURE_RESOURCE_GROUP"
echo "Location: $AZURE_LOCATION"
echo "Cosmos DB Account: $AZURE_COSMOSDB_ACCOUNT"
echo "Storage Account: $AZURE_STORAGE_ACCOUNT"
echo "Function App: $AZURE_FUNCTION_APP"
echo "Cosmos DB Database: $AZURE_COSMOS_DATABASE"
echo "Cosmos DB Container: $AZURE_COSMOS_CONTAINER"
echo "Storage Container: $AZURE_STORAGE_CONTAINER"
echo "------------------------------------"

# --- 1. Create Resource Group ---
echo "Creating resource group: $AZURE_RESOURCE_GROUP in $AZURE_LOCATION..."
if az group show --name "$AZURE_RESOURCE_GROUP" &>/dev/null; then
    echo "Resource group '$AZURE_RESOURCE_GROUP' already exists. Skipping creation."
else
    az group create --name "$AZURE_RESOURCE_GROUP" --location "$AZURE_LOCATION" --output none
    echo "✅ Resource group '$AZURE_RESOURCE_GROUP' created successfully."
fi

# --- 2. Create Cosmos DB (serverless, 400 RU) ---
echo -e "\n=== Creating Cosmos DB Account ==="
echo "Account: $AZURE_COSMOSDB_ACCOUNT"
echo "Database: $AZURE_COSMOS_DATABASE"
echo "Container: $AZURE_COSMOS_CONTAINER"

# Create Cosmos DB account
if az cosmosdb show --name "$AZURE_COSMOSDB_ACCOUNT" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
    echo "Cosmos DB account '$AZURE_COSMOSDB_ACCOUNT' already exists. Skipping creation."
else
    echo "Creating Cosmos DB account..."
    az cosmosdb create \
        --name "$AZURE_COSMOSDB_ACCOUNT" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --locations regionName="$AZURE_LOCATION" failoverPriority=0 \
        --default-consistency-level Session \
        --capabilities EnableServerless \
        --output none
    echo "✅ Cosmos DB account '$AZURE_COSMOSDB_ACCOUNT' created successfully."

    # Create database
    echo "Creating database '$AZURE_COSMOS_DATABASE'..."
    az cosmosdb sql database create \
        --account-name "$AZURE_COSMOSDB_ACCOUNT" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --name "$AZURE_COSMOS_DATABASE" \
        --output none

    # Create container
    echo "Creating container '$AZURE_COSMOS_CONTAINER'..."
    az cosmosdb sql container create \
        --account-name "$AZURE_COSMOSDB_ACCOUNT" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --database-name "$AZURE_COSMOS_DATABASE" \
        --name "$AZURE_COSMOS_CONTAINER" \
        --partition-key-path "/${AZURE_COSMOS_PARTITION_KEY:-id}" \
        --output none
    
    echo "✅ Database and container created successfully."

    # Get connection string
    COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
        --name "$AZURE_COSMOSDB_ACCOUNT" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --type connection-strings \
        --query "connectionStrings[?description=='Primary SQL Connection String'].connectionString" \
        -o tsv)
    
    echo -e "\n=== Cosmos DB Connection String ==="
    echo "$COSMOS_CONNECTION_STRING"
    echo "================================="
fi

# --- 3. Create Blob Storage (standard, LRS) ---
echo -e "\n=== Creating Storage Account ==="
echo "Account: $AZURE_STORAGE_ACCOUNT"
echo "Container: $AZURE_STORAGE_CONTAINER"

# Create storage account
if az storage account show --name "$AZURE_STORAGE_ACCOUNT" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
    echo "Storage account '$AZURE_STORAGE_ACCOUNT' already exists. Skipping creation."
else
    echo "Creating storage account..."
    az storage account create \
        --name "$AZURE_STORAGE_ACCOUNT" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --location "$AZURE_LOCATION" \
        --sku Standard_LRS \
        --kind StorageV2 \
        --enable-hierarchical-namespace false \
        --output none
    echo "✅ Storage account '$AZURE_STORAGE_ACCOUNT' created successfully."

    # Get storage account key
    STORAGE_KEY=$(az storage account keys list \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --query '[0].value' \
        -o tsv)

    # Create container
    echo "Creating container '$AZURE_STORAGE_CONTAINER'..."
    az storage container create \
        --name "$AZURE_STORAGE_CONTAINER" \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --account-key "$STORAGE_KEY" \
        --public-access off \
        --output none

    # Generate connection string
    STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=$AZURE_STORAGE_ACCOUNT;AccountKey=$STORAGE_KEY;EndpointSuffix=core.windows.net"
    
    echo -e "\n=== Storage Account Connection String ==="
    echo "$STORAGE_CONNECTION_STRING"
    echo "========================================"
fi

# --- 4. Create Function App (Consumption Plan) ---
echo -e "\n=== Creating Function App ==="
echo "Function App: $AZURE_FUNCTION_APP"

# Check if the Function App already exists
if az functionapp show --name "$AZURE_FUNCTION_APP" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
    echo "Function App '$AZURE_FUNCTION_APP' already exists. Skipping creation."
else
    # Create the Function App with Consumption Plan
    echo "Creating Function App..."
    az functionapp create \
        --name "$AZURE_FUNCTION_APP" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --consumption-plan-location "$AZURE_LOCATION" \
        --runtime node \
        --runtime-version 22 \
        --functions-version 4 \
        --storage-account "$AZURE_STORAGE_ACCOUNT" \
        --output none
    
    # Configure application settings
    echo "Configuring application settings..."
    az functionapp config appsettings set \
        --name "$AZURE_FUNCTION_APP" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --settings \
            "AZURE_COSMOS_CONNECTION_STRING=$COSMOS_CONNECTION_STRING" \
            "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING" \
            "AZURE_COSMOS_DATABASE=$AZURE_COSMOS_DATABASE" \
            "AZURE_COSMOS_CONTAINER=$AZURE_COSMOS_CONTAINER" \
            "AZURE_COSMOS_PARTITION_KEY=${AZURE_COSMOS_PARTITION_KEY:-id}" \
            "NODE_ENV=production" \
            "PORT=3001" \
            "CORS_ORIGINS=http://localhost:3000,http://localhost:5173" \
            "LOG_LEVEL=info" \
            "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'));" 2>/dev/null || openssl rand -hex 32)" \
            "MAX_FILE_SIZE_MB=10"
    echo "✅ Function App '$AZURE_FUNCTION_APP' created and configured successfully."
fi

# --- 5. Handle Static Web App ---
echo -e "\n=== Static Web App Configuration ==="

# Only proceed with Static Web App creation if AZURE_STATIC_WEB_APP is not set in .env
if [ -z "${AZURE_STATIC_WEB_APP}" ]; then
    echo "AZURE_STATIC_WEB_APP not set in .env. Will create a new Static Web App."
    
    # Generate a default name if not provided
    AZURE_STATIC_WEB_APP="exceletl-app-$(head /dev/urandom | tr -dc 'a-z0-9' | head -c 8)"
    # Use eastasia for Static Web App as it's not available in all regions
    AZURE_STATIC_WEB_APP_LOCATION="${AZURE_STATIC_WEB_APP_LOCATION:-eastasia}"
    AZURE_STATIC_WEB_APP_SKU="${AZURE_STATIC_WEB_APP_SKU:-Free}"
    
    echo "Will create new Static Web App with name: $AZURE_STATIC_WEB_APP"
else
    echo "Using existing Static Web App from .env: $AZURE_STATIC_WEB_APP"
    echo "Skipping Static Web App creation as it's already configured in .env"
    SKIP_STATIC_WEB_APP_CREATION=true
fi

# Create Static Web App if not skipping
if [ -z "$SKIP_STATIC_WEB_APP_CREATION" ]; then
    if az staticwebapp show --name "$AZURE_STATIC_WEB_APP" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
        echo "Static Web App '$AZURE_STATIC_WEB_APP' already exists. Skipping creation."
    else
        echo "Creating Static Web App '$AZURE_STATIC_WEB_APP'..."
        az staticwebapp create \
            --name "$AZURE_STATIC_WEB_APP" \
            --resource-group "$AZURE_RESOURCE_GROUP" \
            --location "$AZURE_STATIC_WEB_APP_LOCATION" \
            --sku "$AZURE_STATIC_WEB_APP_SKU" \
            --output none || {
                echo "❌ Failed to create Static Web App '$AZURE_STATIC_WEB_APP'"
                exit 1
            }
        
        echo "✅ Static Web App '$AZURE_STATIC_WEB_APP' created successfully."
    fi
else
    # Verify the existing Static Web App exists
    if ! az staticwebapp show --name "$AZURE_STATIC_WEB_APP" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
        echo "❌ Specified Static Web App '$AZURE_STATIC_WEB_APP' does not exist in resource group '$AZURE_RESOURCE_GROUP'"
        exit 1
    fi
    echo "✅ Using existing Static Web App: $AZURE_STATIC_WEB_APP"
fi
    
# Get Static Web App properties if it exists
if [ -z "$SKIP_STATIC_WEB_APP_CREATION" ] || az staticwebapp show --name "$AZURE_STATIC_WEB_APP" --resource-group "$AZURE_RESOURCE_GROUP" &>/dev/null; then
    echo "Retrieving Static Web App details..."
    SWA_PROPERTIES=$(az staticwebapp show \
        --name "$AZURE_STATIC_WEB_APP" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --output json) || {
            echo "❌ Failed to retrieve Static Web App details"
            exit 1
        }
        
    SWA_DEFAULT_HOSTNAME=$(echo "$SWA_PROPERTIES" | jq -r '.defaultHostname')
    SWA_API_KEY=$(az staticwebapp secrets list \
        --name "$AZURE_STATIC_WEB_APP" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --query "properties.apiKey" \
        -o tsv) || {
            echo "⚠️ Warning: Failed to retrieve Static Web App API key"
            SWA_API_KEY=""
        }
    
    echo -e "\n=== Static Web App Details ==="
    echo "Name: $AZURE_STATIC_WEB_APP"
    if [ -n "$SWA_DEFAULT_HOSTNAME" ]; then
        echo "URL: https://$SWA_DEFAULT_HOSTNAME"
    else
        echo "URL: Not available"
    fi
    if [ -n "$SWA_API_KEY" ]; then
        echo "API Key: $SWA_API_KEY"
    else
        echo "API Key: Not available"
    fi
    echo "============================"
fi

# --- 6. Configure GitHub Repository Settings ---
if [ -n "$GITHUB_REPO" ]; then
    echo -e "\n=== Configuring GitHub Repository Settings ==="
    
    # Set GitHub repository variables
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "Setting GitHub repository variables..."
        
        # Set GitHub repository variables for deployment
        gh api -X POST \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "/repos/$GITHUB_REPO/actions/variables/AZURE_STATIC_WEB_APP" \
            -f "value=$AZURE_STATIC_WEB_APP"
            
        gh api -X POST \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            "/repos/$GITHUB_REPO/actions/variables/AZURE_STATIC_WEB_APP_API_KEY" \
            -f "value=$SWA_API_KEY"
            
        echo "✅ GitHub repository variables configured."
    else
        echo "GitHub token not provided. Skipping GitHub repository configuration."
        echo "Please set the following GitHub repository variables manually:"
        echo "- AZURE_STATIC_WEB_APP: $AZURE_STATIC_WEB_APP"
        echo "- AZURE_STATIC_WEB_APP_API_KEY: $SWA_API_KEY"
    fi
fi

# --- 7. Generate .env file ---
echo -e "\n=== Generating .env File ==="

# Get Cosmos DB connection details if not already set
if [ -z "$COSMOS_CONNECTION_STRING" ]; then
    COSMOS_CONNECTION_STRING=$(az cosmosdb keys list \
        --name "$AZURE_COSMOSDB_ACCOUNT" \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --type connection-strings \
        --query "connectionStrings[?description=='Primary SQL Connection String'].connectionString" \
        -o tsv)
fi

# Get Storage Account key if not already set
if [ -z "$STORAGE_KEY" ]; then
    STORAGE_KEY=$(az storage account keys list \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --account-name "$AZURE_STORAGE_ACCOUNT" \
        --query '[0].value' \
        -o tsv)
    STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=$AZURE_STORAGE_ACCOUNT;AccountKey=$STORAGE_KEY;EndpointSuffix=core.windows.net"
fi

# Generate a random session secret if not set
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'));" 2>/dev/null || openssl rand -hex 32)
fi

# Create .env file
cat > .env <<EOL
# Azure Resource Configuration
AZURE_RESOURCE_GROUP=$AZURE_RESOURCE_GROUP
AZURE_LOCATION=$AZURE_LOCATION

# Cosmos DB Configuration
AZURE_COSMOSDB_ACCOUNT=$AZURE_COSMOSDB_ACCOUNT
AZURE_COSMOS_ENDPOINT=https://$AZURE_COSMOSDB_ACCOUNT.documents.azure.com:443/
AZURE_COSMOS_KEY=$(az cosmosdb keys list --name "$AZURE_COSMOSDB_ACCOUNT" --resource-group "$AZURE_RESOURCE_GROUP" --query primaryMasterKey -o tsv)
AZURE_COSMOS_DATABASE=$AZURE_COSMOS_DATABASE
AZURE_COSMOS_CONTAINER=$AZURE_COSMOS_CONTAINER
AZURE_COSMOS_PARTITION_KEY=${AZURE_COSMOS_PARTITION_KEY:-id}

# Storage Account Configuration
AZURE_STORAGE_ACCOUNT=$AZURE_STORAGE_ACCOUNT
AZURE_STORAGE_KEY=$STORAGE_KEY
AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONNECTION_STRING"
AZURE_STORAGE_CONTAINER=$AZURE_STORAGE_CONTAINER

# Function App Configuration
AZURE_FUNCTION_APP=$AZURE_FUNCTION_APP
AZURE_FUNCTION_APP_URL=https://$AZURE_FUNCTION_APP.azurewebsites.net

# Output environment variables for GitHub Actions
AZURE_STATIC_WEB_APP=$AZURE_STATIC_WEB_APP
AZURE_STATIC_WEB_APP_URL=https://$SWA_DEFAULT_HOSTNAME
AZURE_STATIC_WEB_APP_API_KEY=$SWA_API_KEY

# Application Settings
NODE_ENV=development
PORT=3001
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=info
SESSION_SECRET=$SESSION_SECRET

# File Upload Configuration
MAX_FILE_SIZE_MB=10
EOL

echo "✅ .env file generated successfully."

# --- 6. Display Summary ---
echo -e "\n=== Azure Resource Provisioning Complete ==="
echo "✅ Resource Group: $AZURE_RESOURCE_GROUP"
echo "✅ Cosmos DB Account: $AZURE_COSMOSDB_ACCOUNT"
echo "  - Database: $AZURE_COSMOS_DATABASE"
echo "  - Container: $AZURE_COSMOS_CONTAINER"
echo "✅ Storage Account: $AZURE_STORAGE_ACCOUNT"
echo "  - Container: $AZURE_STORAGE_CONTAINER"
echo "✅ Function App: $AZURE_FUNCTION_APP"

echo -e "\nNext steps:"
echo "1. Review the generated .env file for your application configuration"
echo "2. Deploy your function code to the Function App"
echo "3. Update your frontend application with the appropriate API endpoints"
echo "4. Test your application with the provided connection strings"