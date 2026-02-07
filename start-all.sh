#!/bin/bash

# NexusCare - Quick Start Script
# This script starts both Django backend and React frontend servers

echo "🚀 Starting NexusCare Application..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if backend is already running
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Backend already running on port 8000${NC}"
else
    echo -e "${BLUE}📦 Starting Django Backend Server...${NC}"
    cd "$SCRIPT_DIR/backend"
    if [ -f "manage.py" ]; then
        # Activate virtual environment and start Django
        source .venv/bin/activate
        python manage.py runserver > /tmp/nexuscare-backend.log 2>&1 &
        BACKEND_PID=$!
        echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
        echo "   Logs: /tmp/nexuscare-backend.log"
    else
        echo -e "${RED}❌ Django manage.py not found${NC}"
        echo "   Check your backend directory path"
    fi
    sleep 3
fi

# Check if React frontend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  React Frontend already running on port 3000${NC}"
else
    echo -e "${BLUE}⚛️  Starting React Frontend (Next.js)...${NC}"
    cd "$SCRIPT_DIR/frontend"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies (first time)...${NC}"
        npm install
    fi
    
    # Start Next.js dev server
    npm run dev > /tmp/nexuscare-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ React Frontend started (PID: $FRONTEND_PID)${NC}"
    echo "   Logs: /tmp/nexuscare-frontend.log"
    sleep 3
fi

echo ""
echo -e "${GREEN}🎉 NexusCare is ready!${NC}"
echo ""
echo "📍 Access Points:"
echo "   React Frontend: http://localhost:3000"
echo "   Django Backend: http://localhost:8000"
echo "   API Endpoints:  http://localhost:8000/api"
echo "   Admin Panel:    http://localhost:8000/admin"
echo ""
echo "🔐 Demo Accounts:"
echo "   Patient: patient@example.com / TestPass123!"
echo "   Doctor:  doctor@example.com / TestPass123!"
echo "   Admin:   admin@example.com / admin"
echo ""
echo "📄 Main Pages:"
echo "   - Home:             http://localhost:3000"
echo "   - Login:            http://localhost:3000/login"
echo "   - Register:         http://localhost:3000/register"
echo "   - Patient Dashboard: http://localhost:3000/dashboard"
echo "   - Doctor Dashboard:  http://localhost:3000/dashboard"
echo "   - Book Appointment:  http://localhost:3000/dashboard/appointments/book"
echo "   - Medical Records:   http://localhost:3000/dashboard/records"
echo ""
echo "📊 Features:"
echo "   ✅ Real Django API Integration"
echo "   ✅ React 19 + Next.js 15"
echo "   ✅ Email-based Authentication + 2FA"
echo "   ✅ Patient & Doctor Dashboards"
echo "   ✅ Appointment Booking System"
echo "   ✅ Medical Records Management"
echo "   ✅ AI-Powered Health Insights"
echo ""
echo "🛑 To stop all services: ./stop-all.sh"
echo "📝 View logs:"
echo "   Backend:  tail -f /tmp/nexuscare-backend.log"
echo "   Frontend: tail -f /tmp/nexuscare-frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   pkill -f 'manage.py runserver'"
echo "   pkill -f 'next dev'"
echo ""

# Open browser to the correct URL (localhost:3000)
if command -v xdg-open > /dev/null; then
    echo "🌐 Opening browser..."
    xdg-open http://localhost:3000 2>/dev/null &
elif command -v open > /dev/null; then
    open http://localhost:3000 2>/dev/null &
fi

echo "✨ Ready to go!"
