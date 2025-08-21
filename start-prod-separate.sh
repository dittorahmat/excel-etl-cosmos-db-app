#!/bin/sh
set -e

# This script mimics the `preview:full` command from package.json, but without the build step.
# It is intended for running in the production container.

echo "Starting backend server and frontend preview server..."

# The `preview:full` command is:
# "preview:full": "npm run build && concurrently "npm run start:server" "npm run preview""
# We will run the two commands concurrently.
# The backend port is determined by server/.env or defaults in the code.
# We'll explicitly set the frontend preview port to 3000.

npx concurrently "PORT=3001 npm run start" "PORT=3000 pm run preview"
