# Let's Encrypt Certificate Setup Instructions

## Current Status
The application is currently using self-signed certificates for HTTPS functionality. Once the domain is accessible from the internet, follow these steps to obtain proper Let's Encrypt certificates.

## Prerequisites for Let's Encrypt
1. Ensure your domain `iesr.southeastasia.cloudapp.azure.com` is publicly accessible
2. Port 80 must be open to the internet for the ACME challenge
3. The domain must resolve to this server's public IP address

## Steps to Obtain Let's Encrypt Certificates

1. Ensure the nginx configuration allows Let's Encrypt challenges (already configured in nginx.conf)
2. Run the following command to obtain certificates:
   ```
   sudo certbot certonly --webroot --webroot-path /var/www/certbot --email admin@iesr.southeastasia.cloudapp.azure.com --agree-tos --no-eff-email --domains iesr.southeastasia.cloudapp.azure.com
   ```

3. After successful certificate issuance, restart the nginx container:
   ```
   docker-compose restart nginx
   ```

## Automatic Renewal
Let's Encrypt certificates need to be renewed every 90 days. The following components handle automatic renewal:

1. The system has certbot.timer service enabled that automatically checks for renewal:
   ```
   sudo systemctl status certbot.timer
   ```

2. The renewal script is located at `/home/iesr/excel-etl-cosmos-db-app/reload-nginx.sh` which automatically reloads nginx after certificate renewal.

## Testing Renewal
To test the renewal process (using Let's Encrypt staging environment):
```
sudo certbot renew --dry-run
```

## Notes
- The nginx configuration is already set up to work with Let's Encrypt certificates
- The docker-compose.yml includes the webroot volume mapping for Let's Encrypt challenges
- The reload-nginx.sh script will reload nginx configuration after renewals
- Currently using self-signed certificates as fallback until domain accessibility is resolved