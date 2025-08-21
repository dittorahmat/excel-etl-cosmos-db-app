#!/bin/sh
set -e

# This script starts the backend server and frontend preview server.
# It is intended for running in the production container.

echo "Starting backend server and frontend preview server..."

# Print Git commit hash for build consistency check (if available)
echo "Container Git Commit: $(cd /app && git rev-parse HEAD 2>/dev/null || echo 'Not available')"

# Print Azure environment variables
echo "=== Azure Environment Variables ==="
./scripts/print-azure-env.sh
echo "=== End of Azure Environment Variables ==="

# Function to run a connectivity test
run_test() {
  local test_name=$1
  local test_command=$2
  
  echo "Running $test_name..."
  if eval "$test_command"; then
    echo "$test_name: PASSED"
  else
    echo "$test_name: FAILED"
    return 1
  fi
}

# Run Azure connectivity tests
echo "=== Running Azure Connectivity Tests ==="

# Test Cosmos DB connection
run_test "Cosmos DB Connection Test" "npx tsx scripts/test-cosmos-connection.ts"

# Test Blob Storage connection
run_test "Blob Storage Connection Test" "npx tsx scripts/test-blob-connection.ts"

echo "=== End of Connectivity Tests ==="

# The `preview:full` command is:
# "preview:full": "npm run build && concurrently "npm run start:server" "npm run preview""
# We will run the two commands concurrently.
# The backend port is determined by environment variables or defaults in the code.
# We'll explicitly set the frontend preview port to 3000.

# Since server/.env is not included in the Docker image, and Easypanel should provide the environment variables,
# we can directly use npm run start which will rely on process.env.
# The env.ts file will handle loading from process.env if no .env file is found.

npx concurrently "PORT=3001 npm run start" "npm run preview -- --port 3000 --host"
