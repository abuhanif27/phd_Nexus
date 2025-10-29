#!/bin/bash

# NexusCare - Stop Script
# This script stops both backend and frontend servers

echo "🛑 Stopping NexusCare Application..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop backend
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Stopping Backend Server...${NC}"
    pkill -f 'manage.py runserver'
    sleep 1
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Backend still running, using force kill...${NC}"
        pkill -9 -f 'manage.py runserver'
    else
        echo -e "${GREEN}✅ Backend stopped${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Backend was not running${NC}"
fi

# Stop frontend
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Stopping Frontend Server...${NC}"
    pkill -f 'http.server 8080'
    sleep 1
    if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Frontend still running, using force kill...${NC}"
        pkill -9 -f 'http.server 8080'
    else
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Frontend was not running${NC}"
fi

echo ""
echo -e "${GREEN}✨ All servers stopped${NC}"
