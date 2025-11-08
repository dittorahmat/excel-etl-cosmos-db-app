# HTTPS Setup for Domain-based Access

This guide explains how to set up proper HTTPS certificates for your domain using Let's Encrypt.

## Prerequisites

1. A domain name pointing to your VPS IP address
2. Ports 80 and 443 open on your VPS
3. Docker and Docker Compose installed

## Option 1: Using Certbot with Docker (Recommended)

### 1. Install Certbot Docker image
```bash
# Pull the Certbot image
docker pull certbot/certbot
```

### 2. Obtain certificates
```bash
# Make sure your nginx container is stopped to free port 80
docker-compose down

# Run Certbot to obtain certificates
docker run --rm -it \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/certs:/etc/letsencrypt \
  certbot/certbot certonly \
  --standalone \
  -d iesr.southeastasia.cloudapp.azure.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

### 3. Update nginx.conf to use Let's Encrypt certificates
Modify your nginx.conf to point to the Let's Encrypt certificates:
```nginx
# In the HTTPS server block, update these lines:
ssl_certificate /etc/nginx/ssl/live/iesr.southeastasia.cloudapp.azure.com/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/live/iesr.southeastasia.cloudapp.azure.com/privkey.pem;
```

### 4. Start your application
```bash
docker-compose up -d
```

## Option 2: Using Nginx with Certbot in the same container

### 1. Modify docker-compose.yml
Add Certbot service to your docker-compose.yml:
```yaml
services:
  # ... your existing services ...
  
  certbot:
    image: certbot/certbot
    volumes:
      - ./certs:/etc/letsencrypt
      - ./webroot:/var/www/certbot
    command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d iesr.southeastasia.cloudapp.azure.com
```

### 2. Update nginx.conf to support webroot challenge
Add a location block to your HTTP server block in nginx.conf:
```nginx
location /.well-known/acme-challenge/ {
    root /var/www/certbot;
}
```

### 3. Obtain initial certificates
```bash
docker-compose run --rm  certbot
```

### 4. Start all services
```bash
docker-compose up -d
```

### 5. Set up auto-renewal
Add a command to your crontab to renew certificates automatically:
```bash
0 3 * * * /path/to/your/project/docker-compose run --rm certbot renew >> /var/log/cron.log 2>&1
```

## Troubleshooting

1. **Port 80 in use**: Make sure no other service is using port 80. Stop your web server if necessary before running Certbot standalone.
2. **Firewall issues**: Ensure your firewall allows traffic on ports 80 and 443.
3. **Domain not pointing correctly**: Double-check your DNS settings.
