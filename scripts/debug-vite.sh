#!/bin/bash
# Script to debug Vite installation and environment setup

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo -n "Vite version: "
jq -r '.devDependencies.vite // .dependencies.vite // "Not found"' package.json

echo -e "\nBuild will use these environment variables from Azure:"
[ -z "$VITE_AZURE_CLIENT_ID" ] && echo "- VITE_AZURE_CLIENT_ID: Will use Azure Portal setting" || echo "- VITE_AZURE_CLIENT_ID: Set in workflow"
[ -z "$VITE_AZURE_TENANT_ID" ] && echo "- VITE_AZURE_TENANT_ID: Will use Azure Portal setting" || echo "- VITE_AZURE_TENANT_ID: Set in workflow"
[ -z "$VITE_AZURE_REDIRECT_URI" ] && echo "- VITE_AZURE_REDIRECT_URI: Will use Azure Portal setting" || echo "- VITE_AZURE_REDIRECT_URI: Set in workflow"
