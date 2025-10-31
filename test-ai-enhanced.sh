#!/bin/bash

# Test Enhanced AI Analysis Endpoint
# This script tests both Quick and Deep analysis modes

echo "🧠 Testing Enhanced AI Analysis System"
echo "========================================"
echo ""

# Configuration
BASE_URL="http://localhost:8000"
API_ENDPOINT="${BASE_URL}/api/ai/analyze-enhanced/"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo -n "Checking if backend server is running... "
if curl -s "${BASE_URL}/api/auth/login/" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo ""
    echo "Please start the backend server first:"
    echo "  cd backend"
    echo "  python manage.py runserver"
    exit 1
fi

echo ""

# Get authentication token
echo "📝 Logging in to get access token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "patient@example.com",
        "password": "Pass1234!"
    }')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))" 2>/dev/null)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}✗ Failed to get access token${NC}"
    echo "Please make sure you have a user account:"
    echo "  Email: patient@example.com"
    echo "  Password: Pass1234!"
    echo ""
    echo "Create account at: ${BASE_URL}/api/auth/register/"
    exit 1
fi

echo -e "${GREEN}✓ Successfully authenticated${NC}"
echo ""

# Test 1: Quick Mode
echo -e "${BLUE}Test 1: Quick Answer Mode${NC}"
echo "=========================="
echo "Symptoms: Mild headache and fever for 2 days"
echo ""

QUICK_RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
        "symptoms": "Mild headache and fever for 2 days",
        "mode": "quick"
    }')

if echo "$QUICK_RESPONSE" | python3 -c "import sys, json; json.load(sys.stdin); print('valid')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Quick mode response received${NC}"
    echo ""
    echo "Response Summary:"
    echo "$QUICK_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"  Mode: {data.get('mode', 'N/A')}\")
print(f\"  Specialist: {data.get('analysis', {}).get('primary_recommendation', 'N/A')}\")
print(f\"  Confidence: {data.get('analysis', {}).get('confidence', 0):.2%}\")
print(f\"  Processing Time: {data.get('analysis', {}).get('processing_time', 'N/A')}\")
print(f\"  Urgency: {data.get('next_steps', {}).get('urgency', 'N/A')}\")
print(f\"  Disclaimer Present: {'Yes' if data.get('disclaimer') else 'No'}\")
" 2>/dev/null
else
    echo -e "${RED}✗ Invalid response from quick mode${NC}"
    echo "Response: $QUICK_RESPONSE"
fi

echo ""
echo ""

# Test 2: Deep Mode
echo -e "${BLUE}Test 2: Deep Analysis Mode${NC}"
echo "=========================="
echo "Symptoms: Severe chest pain radiating to left arm, sweating"
echo ""

DEEP_RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
        "symptoms": "Severe chest pain radiating to left arm, sweating",
        "mode": "deep",
        "include_history": true
    }')

if echo "$DEEP_RESPONSE" | python3 -c "import sys, json; json.load(sys.stdin); print('valid')" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Deep mode response received${NC}"
    echo ""
    echo "Response Summary:"
    echo "$DEEP_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"  Mode: {data.get('mode', 'N/A')}\")
print(f\"  Specialist: {data.get('analysis', {}).get('recommended_specialist', 'N/A')}\")
print(f\"  Confidence: {data.get('analysis', {}).get('confidence', 0):.2%}\")
print(f\"  Processing Time: {data.get('analysis', {}).get('processing_time', 'N/A')}\")
print(f\"  Urgency: {data.get('next_steps', {}).get('urgency', 'N/A')}\")

# Historical context
hist = data.get('analysis', {}).get('historical_context', {})
if hist:
    print(f\"  Records Reviewed: {hist.get('total_records', 0)}\")
    print(f\"  Lab Results: {hist.get('lab_results_reviewed', 0)}\")
    print(f\"  Prescriptions: {hist.get('prescriptions_reviewed', 0)}\")

# Knowledge base
kb = data.get('analysis', {}).get('medical_knowledge', {})
if kb:
    print(f\"  Knowledge Base Hits: {kb.get('knowledge_base_hits', 0)}\")

print(f\"  Disclaimer Present: {'Yes' if data.get('disclaimer') else 'No'}\")
" 2>/dev/null
else
    echo -e "${RED}✗ Invalid response from deep mode${NC}"
    echo "Response: $DEEP_RESPONSE"
fi

echo ""
echo ""

# Test 3: Error Handling - Invalid Mode
echo -e "${BLUE}Test 3: Error Handling (Invalid Mode)${NC}"
echo "======================================"
echo "Testing with invalid mode: 'invalid_mode'"
echo ""

ERROR_RESPONSE=$(curl -s -X POST "$API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
        "symptoms": "test symptoms",
        "mode": "invalid_mode"
    }')

if echo "$ERROR_RESPONSE" | grep -q "error\|Error\|invalid"; then
    echo -e "${GREEN}✓ Error handling working correctly${NC}"
    echo "Error message:"
    echo "$ERROR_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"  {data.get('error', data.get('detail', 'Unknown error'))}\")
except:
    print('  Error response received')
" 2>/dev/null
else
    echo -e "${YELLOW}⚠ Unexpected response to invalid mode${NC}"
fi

echo ""
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}✅ Testing Complete!${NC}"
echo "========================================"
echo ""
echo "Next Steps:"
echo "  1. Test the frontend: http://localhost:8080/ai-analysis-enhanced.html"
echo "  2. Try both Quick and Deep modes with different symptoms"
echo "  3. Check that medical disclaimers are always visible"
echo "  4. Verify thinking animations appear during processing"
echo ""
echo "Documentation:"
echo "  - AI_SYSTEM_REDESIGN.md - Complete system documentation"
echo "  - backend/API_DOCS.md - API reference"
echo ""
