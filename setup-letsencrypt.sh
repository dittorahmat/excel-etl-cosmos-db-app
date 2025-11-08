#!/bin/bash

# Script to set up Let's Encrypt certificate for production use

echo "=== Setting up Let's Encrypt Certificate ==="

# Check if certbot is installed
if ! command -v certbot &> /dev/null
then
    echo "ERROR: Certbot is not installed. Please install certbot first."
    exit 1
fi

echo "This script will help you obtain a Let's Encrypt certificate for production use."
echo "Before proceeding, please ensure that:"
echo "1. Port 80 is accessible from the internet (firewall rules)"
echo "2. The domain iesr.southeastasia.cloudapp.azure.com points to this server's IP"
echo "3. You have a valid email address for Let's Encrypt notifications"

echo ""
read -p "Do you want to proceed with Let's Encrypt certificate setup? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Setup cancelled."
    exit 1
fi

# Get email address for Let's Encrypt
read -p "Enter your email address for Let's Encrypt notifications: " EMAIL

# Validate email format
if [[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo "ERROR: Invalid email format."
    exit 1
fi

# Check if we already have a certificate
if [ -f "/etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem" ]; then
    echo "Certificate already exists. Checking if it needs renewal..."
    sudo certbot renew --dry-run
    if [ $? -eq 0 ]; then
        echo "Certificate is valid and does not need renewal."
        # Copy the existing certificate to our application directory
        echo "Copying existing certificate to application directory..."
        sudo mkdir -p /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
        sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
        sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
        
        # Fix permissions
        sudo chown -R iesr:iesr /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
        chmod 644 /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem
        chmod 600 /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem
        
        echo "Existing certificate copied successfully!"
        echo "You can now restart nginx with: docker-compose -p excel-etl-cosmos-db-app restart nginx"
        exit 0
    fi
fi

# Check if port 80 is available (required for HTTP-01 challenge)
if command -v ss &> /dev/null; then
    if sudo ss -tlnp | grep :80 | grep -q LISTEN; then
        echo "WARNING: Port 80 appears to be in use."
        echo "For Let's Encrypt certificate issuance, we need to temporarily use port 80."
        read -p "Do you want to stop the nginx container to free up port 80? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]
        then
            # Stop nginx container if it's running
            if docker-compose -p excel-etl-cosmos-db-app ps | grep -q nginx; then
                echo "Stopping nginx container..."
                docker-compose -p excel-etl-cosmos-db-app stop nginx
            fi
        else
            echo "Please manually stop the service using port 80 and run this script again."
            exit 1
        fi
    fi
elif command -v netstat &> /dev/null; then
    if sudo netstat -tlnp | grep :80 | grep -q LISTEN; then
        echo "WARNING: Port 80 appears to be in use."
        echo "For Let's Encrypt certificate issuance, we need to temporarily use port 80."
        read -p "Do you want to stop the nginx container to free up port 80? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]
        then
            # Stop nginx container if it's running
            if docker-compose -p excel-etl-cosmos-db-app ps | grep -q nginx; then
                echo "Stopping nginx container..."
                docker-compose -p excel-etl-cosmos-db-app stop nginx
            fi
        else
            echo "Please manually stop the service using port 80 and run this script again."
            exit 1
        fi
    fi
fi

# Obtain certificate using standalone mode (temporary web server)
echo "Obtaining certificate for iesr.southeastasia.cloudapp.azure.com..."
sudo certbot certonly --standalone -d iesr.southeastasia.cloudapp.azure.com --non-interactive --agree-tos --email "$EMAIL"

# Check if certificate was obtained successfully
if [ -f "/etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem" ]; then
    echo "Certificate obtained successfully!"
    
    # Copy certificates to our application directory
    echo "Copying certificates to application directory..."
    sudo mkdir -p /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    
    # Fix permissions
    sudo chown -R iesr:iesr /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    chmod 644 /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem
    chmod 600 /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem
    
    echo "Certificates copied successfully!"
    echo ""
    echo "To complete the setup:"
    echo "1. Restart nginx: docker-compose -p excel-etl-cosmos-db-app restart nginx"
    echo "2. Test HTTPS access to https://iesr.southeastasia.cloudapp.azure.com"
    echo ""
    echo "For automatic certificate renewal, add this to your crontab:"
    echo "0 12 * * * /home/iesr/excel-etl-cosmos-db-app/renew-letsencrypt.sh"
else
    echo "ERROR: Failed to obtain certificate."
    echo "Please check that:"
    echo "1. The domain iesr.southeastasia.cloudapp.azure.com points to this server's IP"
    echo "2. Port 80 is accessible from the internet"
    echo "3. No firewall is blocking the connection"
    exit 1
fi