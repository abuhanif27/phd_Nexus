#!/bin/bash

# Test Backend Connection from Frontend

echo "=========================================="
echo "🔍 Testing Backend Connection"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Backend Reachable
echo -e "${YELLOW}[1/3] Testing if backend is reachable...${NC}"
if curl -s http://localhost:8000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
else
    echo -e "${RED}✗ Backend is NOT responding${NC}"
    echo "Please start backend: cd backend && source .venv/bin/activate && python manage.py runserver"
    exit 1
fi
echo ""

# Test 2: API Endpoint
echo -e "${YELLOW}[2/3] Testing API endpoint...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/auth/login/ -X OPTIONS)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API endpoint accessible (HTTP $RESPONSE)${NC}"
else
    echo -e "${YELLOW}⚠ API endpoint returned HTTP $RESPONSE${NC}"
fi
echo ""

# Test 3: CORS
echo -e "${YELLOW}[3/3] Testing CORS configuration...${NC}"
CORS_HEADER=$(curl -s -I -X OPTIONS http://localhost:8000/api/auth/login/ \
    -H "Origin: http://localhost:8080" \
    -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin")

if [ -n "$CORS_HEADER" ]; then
    echo -e "${GREEN}✓ CORS is configured${NC}"
    echo "  $CORS_HEADER"
else
    echo -e "${RED}✗ CORS is NOT configured for port 8080${NC}"
    echo ""
    echo -e "${YELLOW}Fix: Add these lines to backend/nexuscare/settings.py:${NC}"
    echo ""
    echo "CORS_ALLOWED_ORIGINS = ["
    echo "    \"http://localhost:3000\","
    echo "    \"http://127.0.0.1:3000\","
    echo "    \"http://localhost:8080\","
    echo "    \"http://127.0.0.1:8080\","
    echo "]"
    echo ""
    echo -e "${YELLOW}Then restart the backend server.${NC}"
    exit 1
fi
echo ""

# Test 4: Login Endpoint
echo -e "${YELLOW}[Bonus] Testing login endpoint...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"patient@example.com","password":"Pass1234!"}')

if echo "$LOGIN_RESPONSE" | grep -q "access"; then
    echo -e "${GREEN}✓ Login endpoint works!${NC}"
    echo "  Demo account login successful"
else
    echo -e "${RED}✗ Login endpoint failed${NC}"
    echo "  Response: $LOGIN_RESPONSE"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✓ Connection Test Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${YELLOW}If all tests passed, try registering again.${NC}"
echo -e "${YELLOW}If CORS test failed, restart backend after fixing settings.${NC}"
echo ""
