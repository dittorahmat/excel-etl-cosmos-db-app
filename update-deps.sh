#!/bin/bash

# Script to update dependencies for the Excel to Cosmos DB Dashboard

echo "=== Updating Dependencies ==="

# Check if npm is available
if ! command -v npm &> /dev/null
then
    echo "ERROR: npm is not installed"
    exit 1
fi

echo "Backing up current package files..."
cp package.json package.json.backup
cp server/package.json server/package.json.backup

echo "Checking for outdated dependencies..."
npm outdated

echo "Updating root dependencies..."
npm update

echo "Updating server dependencies..."
cd server
npm update
cd ..

echo "Checking for major version updates (optional)..."
echo "You can manually update these dependencies to their latest versions:"
npm outdated

echo ""
echo "=== Dependency Update Complete ==="
echo "Backup files have been created:"
echo "  - package.json.backup"
echo "  - server/package.json.backup"
echo ""
echo "To check what changed, run:"
echo "  diff package.json.backup package.json"
echo "  diff server/package.json.backup server/package.json"
echo ""
echo "To install updated dependencies, run:"
echo "  npm install"
echo "  cd server && npm install"