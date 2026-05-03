#!/bin/bash
cd /home/hn/Desktop/CODE/phd_Nexus
echo "Waiting for pip to finish..."
while pgrep -f "pip install.*requirements.txt" > /dev/null; do
    sleep 5
done
echo "Pip finished. Starting..."
./start-all.sh
