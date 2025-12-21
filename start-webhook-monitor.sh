#!/bin/bash

# Wrapper script to run both webhook server and deployment monitor

# Set up the path to include node
export PATH="/home/iesr/.nvm/versions/node/v20.19.5/bin:$PATH"

# Start the webhook server in the background
cd /home/iesr/excel-etl-cosmos-db-app
node deploy-webhook.js &
WEBHOOK_PID=$!

# Start the deployment monitor in the background
/home/iesr/excel-etl-cosmos-db-app/monitor-deploy.sh &
MONITOR_PID=$!

# Function to handle shutdown
cleanup() {
    echo "Shutting down services..."
    kill $WEBHOOK_PID 2>/dev/null
    kill $MONITOR_PID 2>/dev/null
    exit 0
}

# Set up signal trapping for graceful shutdown
trap cleanup SIGTERM SIGINT

# Wait for both processes
wait $WEBHOOK_PID
wait $MONITOR_PID