#!/bin/bash
# Script to update the system

# Update package lists
sudo apt update

# Upgrade installed packages
sudo apt upgrade -y

# Log the update
echo "System update completed on $(date)" >> /var/log/system-update.log