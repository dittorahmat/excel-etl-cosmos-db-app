#!/bin/bash

# Script to renew Let's Encrypt certificates
cd /home/iesr/excel-etl-cosmos-db-app

# Stop nginx to free up ports 80 and 443
docker-compose stop nginx

# Renew certificates
docker run --rm -p 80:80 -p 443:443 -v /home/iesr/excel-etl-cosmos-db-app/certs:/etc/letsencrypt certbot/certbot renew --standalone

# Start nginx again
docker-compose start nginx