#!/bin/bash

# Test script for HTTPS setup

echo "=== Testing HTTPS Setup Files ==="

# Check if required tools are installed
if ! command -v certbot &> /dev/null
then
    echo "⚠️  Certbot is not installed"
else
    echo "✓ Certbot is installed"
fi

# Check if setup scripts exist
SCRIPTS=("setup-letsencrypt.sh" "renew-letsencrypt.sh")

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        echo "✓ $script exists and is executable"
    else
        echo "✗ $script is missing or not executable"
    fi
done

# Check if documentation exists
if [ -f "HTTPS_SETUP_GUIDE.md" ]; then
    echo "✓ HTTPS_SETUP_GUIDE.md exists"
else
    echo "✗ HTTPS_SETUP_GUIDE.md is missing"
fi

# Check current certificate status
echo ""
echo "=== Current Certificate Status ==="
if [ -f "/home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem" ]; then
    echo "✓ Local certificate files exist"
    # Check certificate details
    openssl x509 -in /home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem -noout -dates 2>/dev/null || echo "⚠️  Cannot read certificate dates"
else
    echo "⚠️  Local certificate files do not exist"
fi

echo ""
echo "To set up proper HTTPS with Let's Encrypt:"
echo "  1. Ensure iesr.southeastasia.cloudapp.azure.com points to this server"
echo "  2. Ensure ports 80 and 443 are accessible"
echo "  3. Run: ./setup-letsencrypt.sh"