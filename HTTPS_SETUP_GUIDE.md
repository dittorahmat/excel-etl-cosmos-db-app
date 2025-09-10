# HTTPS Setup Guide

This guide explains how to set up proper HTTPS for the Excel to Cosmos DB Dashboard application using Let's Encrypt certificates.

## Current Issue

The application is currently using self-signed certificates, which causes browsers to show a "Your connection is not private" warning. This happens because self-signed certificates are not trusted by browsers or operating systems.

## Solution: Let's Encrypt Certificates

Let's Encrypt provides free, trusted SSL/TLS certificates that are recognized by all major browsers.

## Prerequisites

1. The domain `iesr.indonesiacentral.cloudapp.azure.com` must point to this server's IP address
2. Port 80 must be accessible from the internet (for certificate validation)
3. Port 443 must be accessible from the internet (for HTTPS access)

## Setup Process

### 1. Install Certbot
```bash
sudo apt update
sudo apt install certbot
```

### 2. Run the Setup Script
```bash
./setup-letsencrypt.sh
```

This script will:
- Check prerequisites
- Obtain a certificate from Let's Encrypt
- Copy the certificate to the application directory
- Set proper permissions

### 3. Restart Nginx
```bash
docker-compose -p excel-etl-cosmos-db-app start nginx
```

## Certificate Renewal

Let's Encrypt certificates expire every 90 days. To ensure continuous service:

### Manual Renewal
```bash
./renew-letsencrypt.sh
```

### Automatic Renewal
Add this line to your crontab (`crontab -e`):
```bash
0 12 * * * /home/iesr/excel-etl-cosmos-db-app/renew-letsencrypt.sh
```

This will check for certificate renewal daily at noon.

## Troubleshooting

### Port 80 Already in Use
If you get an error that port 80 is in use:
1. Stop the nginx container: `docker-compose -p excel-etl-cosmos-db-app stop nginx`
2. Run the setup script again
3. Start nginx after setup: `docker-compose -p excel-etl-cosmos-db-app start nginx`

### Domain Not Pointing to Server
Ensure that `iesr.indonesiacentral.cloudapp.azure.com` resolves to this server's public IP address.

### Firewall Issues
Check that your firewall rules allow inbound connections on ports 80 and 443.

## Verification

After setup, you should be able to access the application at:
https://iesr.indonesiacentral.cloudapp.azure.com

The browser should show a secure connection without any warnings.