#!/bin/bash

# NexusCare - Stop Script
# This script stops both Django backend and React frontend servers

echo "🛑 Stopping NexusCare Application..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop Django backend (port 8000)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Stopping Django Backend Server...${NC}"
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

# Stop React frontend (Next.js on port 3000)
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Stopping React Frontend (Next.js)...${NC}"
    pkill -f 'next dev'
    pkill -f 'node.*next-server'
    sleep 1
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}❌ Frontend still running, using force kill...${NC}"
        kill -9 $(lsof -ti:3000)
    else
        echo -e "${GREEN}✅ Frontend stopped${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Frontend was not running${NC}"
fi

# Also stop old frontend if running (port 8080)
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}Stopping old frontend (port 8080)...${NC}"
    pkill -f 'http.server 8080'
    kill -9 $(lsof -ti:8080) 2>/dev/null
    echo -e "${GREEN}✅ Old frontend stopped${NC}"
fi

echo ""
echo -e "${GREEN}✨ All servers stopped${NC}"
