#!/bin/bash
# This script reloads nginx when certificates are renewed

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    cd /home/iesr/excel-etl-cosmos-db-app
    docker-compose exec nginx nginx -s reload
else
    echo "docker-compose not found"
fi