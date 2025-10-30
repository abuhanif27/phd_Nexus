#!/bin/bash

echo "🧪 Testing Tailwind CSS Doctor Booking Enhancement"
echo "================================================="
echo ""

# Test 1: Check if frontend is running
echo "✓ Test 1: Frontend Server"
if curl -s http://localhost:8080/appointments.html | grep -q "Tailwind CSS"; then
    echo "  ✅ PASS: Tailwind CSS is loaded"
else
    echo "  ❌ FAIL: Tailwind CSS not found"
fi

if curl -s http://localhost:8080/appointments.html | grep -q "font-awesome"; then
    echo "  ✅ PASS: Font Awesome is loaded"
else
    echo "  ❌ FAIL: Font Awesome not found"
fi

echo ""

# Test 2: Check if backend is running
echo "✓ Test 2: Backend API"
if curl -s http://localhost:8000/api/doctors/ | grep -q "Authentication"; then
    echo "  ✅ PASS: Backend is running (requires auth)"
else
    echo "  ❌ FAIL: Backend not responding"
fi

echo ""

# Test 3: Check JavaScript file
echo "✓ Test 3: JavaScript Enhancements"
if grep -q "getSpecialtyData" /home/hn-hanif/Desktop/phd_Nexus/frontend/js/appointments.js; then
    echo "  ✅ PASS: Tailwind-based displayDoctors() function found"
else
    echo "  ❌ FAIL: Enhanced JavaScript not found"
fi

if grep -q "fa-heart-pulse" /home/hn-hanif/Desktop/phd_Nexus/frontend/js/appointments.js; then
    echo "  ✅ PASS: Font Awesome icons implemented"
else
    echo "  ❌ FAIL: Font Awesome icons not found"
fi

echo ""

# Test 4: Check HTML structure
echo "✓ Test 4: HTML Structure"
if grep -q "doctorSearchInput" /home/hn-hanif/Desktop/phd_Nexus/frontend/appointments.html; then
    echo "  ✅ PASS: Search input found"
else
    echo "  ❌ FAIL: Search input missing"
fi

if grep -q "doctorResults" /home/hn-hanif/Desktop/phd_Nexus/frontend/appointments.html; then
    echo "  ✅ PASS: Doctor results container found"
else
    echo "  ❌ FAIL: Doctor results container missing"
fi

if grep -q "selectedDoctorDisplay" /home/hn-hanif/Desktop/phd_Nexus/frontend/appointments.html; then
    echo "  ✅ PASS: Selected doctor display found"
else
    echo "  ❌ FAIL: Selected doctor display missing"
fi

echo ""
echo "================================================="
echo "🎉 Testing Complete!"
echo ""
echo "📝 Quick Test Instructions:"
echo "1. Open: http://localhost:8080/appointments.html"
echo "2. Login with your credentials"
echo "3. Click 'Book Appointment' button"
echo "4. You should see:"
echo "   - Beautiful Tailwind CSS styling"
echo "   - Font Awesome icons (🩺, ❤️, 🧠, etc.)"
echo "   - Color-coded doctor cards"
echo "   - Smooth hover effects"
echo "   - Real-time search"
echo ""
echo "💡 If you don't see changes, press Ctrl+Shift+R to hard refresh!"
