#!/bin/sh
# Script to print Azure-related environment variables (without sensitive values)

echo "=== Azure Environment Variables ==="

echo "AZURE_STORAGE_CONNECTION_STRING: $(if [ -n "$AZURE_STORAGE_CONNECTION_STRING" ]; then echo "SET"; else echo "NOT SET"; fi)"
echo "AZURE_COSMOSDB_ENDPOINT: $(if [ -n "$AZURE_COSMOSDB_ENDPOINT" ]; then echo "SET"; else echo "NOT SET"; fi)"
echo "AZURE_COSMOSDB_KEY: $(if [ -n "$AZURE_COSMOSDB_KEY" ]; then echo "SET"; else echo "NOT SET"; fi)"
echo "AZURE_COSMOSDB_DATABASE: $AZURE_COSMOSDB_DATABASE"
echo "AZURE_COSMOSDB_CONTAINER: $AZURE_COSMOSDB_CONTAINER"
echo "AZURE_STORAGE_CONTAINER: $AZURE_STORAGE_CONTAINER"

echo "=== End of Azure Environment Variables ==="