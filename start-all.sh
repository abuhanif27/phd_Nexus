#!/bin/bash

# NexusCare - Quick Start Script
# This script starts both backend and frontend servers

echo "🚀 Starting NexusCare Application..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Backend already running on port 8000${NC}"
else
    echo -e "${BLUE}📦 Starting Backend Server...${NC}"
    cd /home/hn-hanif/Desktop/phd_Nexus/backend
    /home/hn-hanif/Desktop/phd_Nexus/backend/.venv/bin/python manage.py runserver > /tmp/nexuscare-backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
    echo "   Logs: /tmp/nexuscare-backend.log"
    sleep 2
fi

# Check if frontend is already running
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Frontend already running on port 8080${NC}"
else
    echo -e "${BLUE}🌐 Starting Frontend Server...${NC}"
    cd /home/hn-hanif/Desktop/phd_Nexus/frontend
    python3 -m http.server 8080 > /tmp/nexuscare-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
    echo "   Logs: /tmp/nexuscare-frontend.log"
    sleep 1
fi

echo ""
echo -e "${GREEN}🎉 NexusCare is ready!${NC}"
echo ""
echo "📍 Access Points:"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:8000/api"
echo ""
echo "🔐 Demo Accounts:"
echo "   Patient: patient@example.com / TestPass123!"
echo "   Doctor:  doctor@example.com / TestPass123!"
echo ""
echo "📄 Pages Available:"
echo "   - Landing:      http://localhost:8080/"
echo "   - Login:        http://localhost:8080/login.html"
echo "   - Register:     http://localhost:8080/register.html"
echo "   - Dashboard:    http://localhost:8080/dashboard.html"
echo "   - Records:      http://localhost:8080/records.html"
echo "   - Appointments: http://localhost:8080/appointments.html"
echo "   - AI Insights:  http://localhost:8080/ai-insights.html"
echo ""
echo "🛑 To stop servers:"
echo "   pkill -f 'manage.py runserver'"
echo "   pkill -f 'http.server 8080'"
echo ""

# Open browser (optional)
if command -v xdg-open > /dev/null; then
    echo "🌐 Opening browser..."
    xdg-open http://localhost:8080 2>/dev/null &
elif command -v open > /dev/null; then
    open http://localhost:8080 2>/dev/null &
fi

echo "✨ Ready to go!"
