#!/bin/bash
echo "Waiting for pip to finish..."
while pgrep -f "pip install -r requirements.txt" > /dev/null; do
    sleep 5
done
echo "Starting NexusCare application..."
./start-all.sh
