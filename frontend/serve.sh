#!/bin/bash

# NexusCare Frontend Server
# Simple script to serve the frontend with Python

echo "=========================================="
echo "PhD NexusCare Frontend Server"
echo "=========================================="
echo ""

# Check if we're in the frontend directory
if [ ! -f "index.html" ]; then
    echo "Error: index.html not found!"
    echo "Please run this script from the frontend directory."
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}Starting frontend server...${NC}"
echo ""
echo -e "${GREEN}✓ Frontend will be available at:${NC}"
echo -e "  ${BLUE}http://localhost:8080${NC}"
echo ""
echo -e "${YELLOW}Make sure the backend is running at:${NC}"
echo -e "  ${BLUE}http://localhost:8000${NC}"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop the server${NC}"
echo ""
echo "=========================================="
echo ""

# Start Python HTTP server
python3 -m http.server 8080
