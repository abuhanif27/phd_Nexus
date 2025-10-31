#!/bin/bash
# Test the AI API directly

echo "🧪 Testing AI Enhanced API"
echo "=========================="
echo ""

# Test without auth (should fail with 401)
echo "Test 1: Without authentication (expect 401)"
curl -s -X POST http://localhost:8000/api/ai/analyze-enhanced/ \
  -H "Content-Type: application/json" \
  -d '{"symptoms":"headache","mode":"quick","model":"auto"}' | jq . || echo "Failed"

echo ""
echo ""

# Instructions for authenticated test
echo "Test 2: With authentication"
echo "To test with auth, first get your token:"
echo ""
echo "1. Login to get token:"
echo "   TOKEN=\$(curl -s -X POST http://localhost:8000/api/auth/login/ \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"YOUR_EMAIL\",\"password\":\"YOUR_PASSWORD\"}' | jq -r '.access')"
echo ""
echo "2. Then test API:"
echo "   curl -X POST http://localhost:8000/api/ai/analyze-enhanced/ \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H \"Authorization: Bearer \$TOKEN\" \\"
echo "     -d '{\"symptoms\":\"fever and headache\",\"mode\":\"quick\",\"model\":\"auto\"}' | jq ."
echo ""
echo "Or open browser console and check:"
echo "   localStorage.getItem('accessToken')"
