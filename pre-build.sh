#!/bin/bash

# Exit on any error
set -e

echo "=== Running Pre-Build Script ==="

# Define the exact path where EasyPanel is looking for the .env file
EASYPANEL_ENV_PATH="/etc/easypanel/projects/dashboard/iesr/code/deploy_output"

# Create the directory if it doesn't exist
mkdir -p "$EASYPANEL_ENV_PATH"

# Create the .env file in the exact location EasyPanel is looking for
echo "# Auto-generated .env file for EasyPanel" > "$EASYPANEL_ENV_PATH/.env"

# Add all environment variables to the .env file
for var in $(env | grep -v '^_' | grep -v '^\s*#' | cut -d= -f1); do
  if [[ $var != "HOME" && $var != "PATH" && $var != "PWD" && $var != "SHELL" && $var != "SHLVL" ]]; then
    echo "$var=${!var}" >> "$EASYPANEL_ENV_PATH/.env"
  fi
done

# Debug: Verify the file was created
echo "=== .env file created at $EASYPANEL_ENV_PATH/.env ==="
ls -la "$EASYPANEL_ENV_PATH/.env"
