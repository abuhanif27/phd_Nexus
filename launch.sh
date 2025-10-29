#!/bin/bash

# PhD NexusCare - Complete Launch Script
# Starts both backend and frontend servers

echo "=========================================="
echo "🏥 PhD NexusCare Launch Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Check if backend exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}✗ Backend directory not found!${NC}"
    exit 1
fi

# Check if frontend exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}✗ Frontend directory not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting PhD NexusCare...${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}[1/2] Starting Backend API...${NC}"
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
    echo -e "${RED}✗ Virtual environment not found!${NC}"
    echo "Please run: cd backend && ./setup.sh"
    exit 1
fi

# Activate venv and start Django
source .venv/bin/activate
python manage.py runserver > /tmp/nexuscare_backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

# Check if backend started
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    echo -e "  ${BLUE}http://localhost:8000/api${NC}"
else
    echo -e "${RED}✗ Backend failed to start!${NC}"
    echo "Check logs: tail -f /tmp/nexuscare_backend.log"
    exit 1
fi

echo ""

# Start frontend in background
echo -e "${BLUE}[2/2] Starting Frontend Server...${NC}"
cd "$FRONTEND_DIR"

python3 -m http.server 8080 > /tmp/nexuscare_frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 2

# Check if frontend started
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo -e "  ${BLUE}http://localhost:8080${NC}"
else
    echo -e "${RED}✗ Frontend failed to start!${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 NexusCare is Running!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}Access Points:${NC}"
echo -e "  🌐 Frontend:    ${BLUE}http://localhost:8080${NC}"
echo -e "  🔌 Backend API: ${BLUE}http://localhost:8000/api${NC}"
echo -e "  ⚙️  Admin Panel: ${BLUE}http://localhost:8000/admin${NC}"
echo ""
echo -e "${YELLOW}Demo Accounts:${NC}"
echo -e "  👤 Patient: ${BLUE}patient@example.com${NC} / ${BLUE}Pass1234!${NC}"
echo -e "  👨‍⚕️  Doctor:  ${BLUE}doctor@example.com${NC} / ${BLUE}Pass1234!${NC}"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo -e "  Backend PID:  $BACKEND_PID"
echo -e "  Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Backend:  tail -f /tmp/nexuscare_backend.log"
echo -e "  Frontend: tail -f /tmp/nexuscare_frontend.log"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop both servers${NC}"
echo "=========================================="
echo ""

# Save PIDs for cleanup
echo $BACKEND_PID > /tmp/nexuscare_backend.pid
echo $FRONTEND_PID > /tmp/nexuscare_frontend.pid

# Trap Ctrl+C to cleanup
trap cleanup INT

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down NexusCare...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    rm -f /tmp/nexuscare_backend.pid /tmp/nexuscare_frontend.pid
    echo -e "${GREEN}✓ Shutdown complete${NC}"
    exit 0
}

# Wait for user to press Ctrl+C
wait
