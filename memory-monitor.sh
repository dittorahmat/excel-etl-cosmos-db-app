#!/bin/bash
# Script to monitor Docker container memory usage

echo "Monitoring Docker container memory usage..."
echo "------------------------------------------"

while true; do
  docker stats --no-stream excel-etl-cosmos-db-app_excel-to-cosmos_1 excel-etl-cosmos-db-app_nginx_final
  sleep 60
done