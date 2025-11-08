#!/bin/bash

# Script to renew Let's Encrypt certificates and update nginx

echo "=== Renewing Let's Encrypt Certificates ==="

# Renew certificates
sudo certbot renew --quiet

# The certbot renew command returns 0 even if no certificates were due for renewal
# We need to check if certificates were actually renewed
echo "Certificates renewed successfully or not yet due for renewal!"

# Copy certificates to our application directory regardless (they might have been renewed or not)
if [ -f "/etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem" ]; then
    echo "Copying certificates to application directory..."
    sudo mkdir -p /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    sudo cp /etc/letsencrypt/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    
    # Fix permissions
    sudo chown -R iesr:iesr /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/
    chmod 644 /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem
    chmod 600 /opt/excel-etl-cosmos-db-app/certs/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem
    
    # Reload nginx to use new certificates
    echo "Reloading nginx to use certificates..."
    cd /opt/excel-etl-cosmos-db-app && docker-compose exec nginx nginx -s reload 2>/dev/null || echo "Nginx reload failed, restarting instead..." && docker-compose restart nginx
    
    echo "Nginx updated with certificates!"
else
    echo "WARNING: Certificate files not found."
fi