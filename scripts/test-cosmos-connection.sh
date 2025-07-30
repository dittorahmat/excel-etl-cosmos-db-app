#!/bin/bash

# Set environment variables from .env file (check current directory first, then server/)
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE="server/.env"
fi

if [ -f "$ENV_FILE" ]; then
  echo "🔍 Loading environment variables from: $ENV_FILE"
  # Read each line in the .env file
  while IFS= read -r line; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^[^#]*= && ! "$line" =~ ^[[:space:]]*# ]]; then
      # Extract the key and value
      key=$(echo "$line" | cut -d '=' -f 1)
      value=$(echo "$line" | cut -d '=' -f 2-)
      # Remove any surrounding quotes
      value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^\'\(.*\)\'$/\1/")
      # Export the variable
      export "$key"="$value"
    fi
  done < "$ENV_FILE"
else
  echo "⚠️  No .env file found in current directory or server/.env"
fi

# Support both prefixed (AZURE_COSMOS_*) and non-prefixed (COSMOS_*) environment variables
if [ -z "$COSMOS_ENDPOINT" ] && [ -n "$AZURE_COSMOS_ENDPOINT" ]; then
  COSMOS_ENDPOINT="$AZURE_COSMOS_ENDPOINT"
  COSMOS_ACCOUNT="${AZURE_COSMOS_ACCOUNT:-$(echo $COSMOS_ENDPOINT | grep -oP 'https://\K[^.]+')}"
  COSMOS_DATABASE="${AZURE_COSMOS_DATABASE:-excel-import-db}"
  COSMOS_CONTAINER="${AZURE_COSMOS_CONTAINER:-imports}"
  RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-}"
fi

# Check if required environment variables are set
if [ -z "$COSMOS_ACCOUNT" ] || [ -z "$RESOURCE_GROUP" ]; then
  echo "❌ Error: Missing required environment variables"
  echo "You must set either:"
  echo "  - COSMOS_ACCOUNT and RESOURCE_GROUP"
  echo "  - OR AZURE_COSMOS_ACCOUNT and AZURE_RESOURCE_GROUP"
  echo ""
  echo "Current values:"
  echo "COSMOS_ACCOUNT: ${COSMOS_ACCOUNT:-Not set}"
  echo "AZURE_COSMOS_ACCOUNT: ${AZURE_COSMOS_ACCOUNT:-Not set}"
  echo "RESOURCE_GROUP: ${RESOURCE_GROUP:-Not set}"
  echo "AZURE_RESOURCE_GROUP: ${AZURE_RESOURCE_GROUP:-Not set}"
  exit 1
fi

# Set default values if not provided
DATABASE=${COSMOS_DATABASE:-excel-import-db}
CONTAINER=${COSMOS_CONTAINER:-imports}

echo "🔍 Testing Cosmos DB connection to account: $COSMOS_ACCOUNT..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
  echo "❌ Error: Azure CLI is not installed. Please install it and run 'az login' first."
  exit 1
fi

# Check if user is logged in to Azure
if ! az account show &> /dev/null; then
  echo "🔐 Please log in to Azure..."
  az login
fi

# Test database existence
echo "🔍 Checking if database '$DATABASE' exists..."
if az cosmosdb sql database exists \
  --account-name "$COSMOS_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DATABASE" \
  --query 'exists' -o tsv; then
  
  echo "✅ Database '$DATABASE' exists in account '$COSMOS_ACCOUNT'"
  
  # Test container existence
  echo -e "\n🔍 Checking if container '$CONTAINER' exists..."
  if az cosmosdb sql container exists \
    --account-name "$COSMOS_ACCOUNT" \
    --resource-group "$RESOURCE_GROUP" \
    --database-name "$DATABASE" \
    --name "$CONTAINER" \
    --query 'exists' -o tsv; then
    
    echo -e "\n✅ Container '$CONTAINER' exists in database '$DATABASE'"
    echo -e "\n✅ Successfully verified Cosmos DB connection and access!"
    exit 0
  else
    echo -e "\n⚠️  Container '$CONTAINER' does not exist in database '$DATABASE'"
    exit 1
  fi
else
  echo -e "\n❌ Database '$DATABASE' does not exist in account '$COSMOS_ACCOUNT'"
  exit 1
fi
