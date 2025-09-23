#!/bin/bash
# Script to prune unused Docker data

# Prune all unused Docker data (containers, networks, images, build cache)
docker system prune -a -f

# Log the operation
echo "Docker system prune completed on $(date)" >> /var/log/docker-prune.log