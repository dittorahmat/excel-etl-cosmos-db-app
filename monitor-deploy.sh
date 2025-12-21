#!/bin/bash

# Monitor script for automated deployment
# Checks for deployment signal and executes deployment when detected

SIGNAL_FILE="/tmp/deploy_signal"
LAST_PROCESSED_FILE="/tmp/last_deployment_time"

while true; do
    # Check if signal file exists
    if [ -f "$SIGNAL_FILE" ]; then
        # Get the timestamp from the signal file
        SIGNAL_TIME=$(cat "$SIGNAL_FILE")
        
        # Check if we've already processed this signal
        if [ -f "$LAST_PROCESSED_FILE" ]; then
            LAST_PROCESSED=$(cat "$LAST_PROCESSED_FILE")
        else
            LAST_PROCESSED=0
        fi
        
        # If the signal is newer than the last processed time, run deployment
        if [ "$SIGNAL_TIME" -gt "$LAST_PROCESSED" ]; then
            echo "$(date): Deployment signal detected, starting deployment..."
            
            # Run the deployment script
            /home/iesr/excel-etl-cosmos-db-app/deploy.sh
            
            # Update the last processed time
            echo "$SIGNAL_TIME" > "$LAST_PROCESSED_FILE"
            
            echo "$(date): Deployment completed"
        fi
    fi
    
    # Wait before checking again
    sleep 5
done