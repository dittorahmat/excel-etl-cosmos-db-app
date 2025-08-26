# HTTPS Deployment Guide

This guide explains how to deploy the Excel to Cosmos DB Dashboard with HTTPS support using Nginx as a reverse proxy.

## Prerequisites

1. Docker and Docker Compose installed on your VPS
2. Ports 80 and 443 available and not blocked by firewall

## Deployment Steps

1. **Verify SSL Certificates**:
   The self-signed certificates are already included in the `certs` directory:
   - `server.crt` - Certificate file
   - `server.key` - Private key file

2. **Update Environment Variables**:
   Make sure your `.env` file has the correct Azure configuration.

3. **Deploy with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

4. **Access the Application**:
   - HTTP: http://your-vps-ip (will redirect to HTTPS)
   - HTTPS: https://your-vps-ip

## Certificate Warning

Since you're using a self-signed certificate, browsers will show security warnings. This is normal for development/testing.

To proceed in Chrome:
1. Navigate to https://your-vps-ip
2. Click "Advanced"
3. Click "Proceed to [IP] (unsafe)"

For production use:
1. Obtain a domain name
2. Use Let's Encrypt to get a free trusted certificate
3. Follow the instructions in `HTTPS_SETUP.md` for Let's Encrypt setup

## Troubleshooting

1. **Check container logs**:
   ```bash
   docker-compose logs -f
   ```

2. **Verify ports are open**:
   ```bash
   sudo netstat -tlnp | grep ':80\|:443'
   ```

3. **Test HTTPS connection**:
   ```bash
   curl -k https://localhost/health
   ```

4. **Check certificate files**:
   ```bash
   ls -la certs/
   ```

5. **Verify nginx configuration**:
   ```bash
   docker-compose exec nginx nginx -t
   ```