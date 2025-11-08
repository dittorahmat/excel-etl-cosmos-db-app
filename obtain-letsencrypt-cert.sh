#!/bin/bash

# Script to obtain Let's Encrypt certificate for iesr.southeastasia.cloudapp.azure.com

echo "=== Obtaining Let's Encrypt Certificate ==="

# Check if certbot is installed
if ! command -v certbot &> /dev/null
then
    echo "ERROR: Certbot is not installed. Please install certbot first."
    exit 1
fi

# Check if port 80 is available (required for HTTP-01 challenge)
if sudo netstat -tlnp | grep :80 | grep -q LISTEN; then
    echo "ERROR: Port 80 is already in use. Please stop the service using port 80."
    echo "You can stop the nginx container with: docker-compose -p excel-etl-cosmos-db-app stop nginx"
    exit 1
fi

# Stop nginx container if it's running
if docker-compose -p excel-etl-cosmos-db-app ps | grep -q nginx; then
    echo "Stopping nginx container..."
    docker-compose -p excel-etl-cosmos-db-app stop nginx
fi

# Obtain certificate using standalone mode (temporary web server)
echo "Obtaining certificate for iesr.southeastasia.cloudapp.azure.com..."
sudo certbot certonly --standalone -d iesr.southeastasia.cloudapp.azure.com --non-interactive --agree-tos --email admin@iesr.southeastasia.cloudapp.azure.com

# Check if certificate was obtained successfully
if [ -f "/etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem" ]; then
    echo "Certificate obtained successfully!"
    
    # Copy certificates to our application directory
    echo "Copying certificates to application directory..."
    sudo mkdir -p /home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem /home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem /home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    
    # Fix permissions
    sudo chown -R iesr:iesr /home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    chmod 644 /home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem
    chmod 600 /home/iesr/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem
    
    echo "Certificates copied successfully!"
    echo "You can now restart nginx with: docker-compose -p excel-etl-cosmos-db-app start nginx"
else
    echo "ERROR: Failed to obtain certificate."
    exit 1
fi