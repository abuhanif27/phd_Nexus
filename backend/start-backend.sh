#!/bin/bash

# Start Backend Server with CORS Fix
# Run this in backend directory

cd "$(dirname "$0")"

echo "=========================================="
echo "🚀 Starting PhD NexusCare Backend"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo -e "${RED}✗ Virtual environment not found!${NC}"
    echo "Please run: ./setup.sh"
    exit 1
fi

# Activate venv
echo -e "${YELLOW}Activating virtual environment...${NC}"
source .venv/bin/activate

# Check CORS settings
echo -e "${YELLOW}Checking CORS configuration...${NC}"
if grep -q "http://localhost:8080" nexuscare/settings.py; then
    echo -e "${GREEN}✓ CORS configured correctly${NC}"
else
    echo -e "${YELLOW}⚠ CORS not configured for port 8080${NC}"
    echo -e "${YELLOW}  Frontend on port 8080 won't work!${NC}"
    echo ""
    echo -e "${YELLOW}Would you like to fix CORS now? (y/n)${NC}"
    read -r fix_cors
    if [ "$fix_cors" = "y" ]; then
        # Create backup
        cp nexuscare/settings.py nexuscare/settings.py.backup
        
        # Fix CORS using Python to be safe
        python3 << 'EOF'
import re

with open('nexuscare/settings.py', 'r') as f:
    content = f.read()

# Find and replace CORS_ALLOWED_ORIGINS
old_pattern = r'CORS_ALLOWED_ORIGINS = \[(.*?)\]'
new_origins = '''CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]'''

content = re.sub(old_pattern, new_origins, content, flags=re.DOTALL)

with open('nexuscare/settings.py', 'w') as f:
    f.write(content)

print("✓ CORS settings updated")
EOF
        echo -e "${GREEN}✓ CORS fixed${NC}"
    fi
fi
echo ""

# Start server
echo -e "${GREEN}Starting Django development server...${NC}"
echo ""
echo -e "${BLUE}Backend will be available at:${NC}"
echo -e "  ${GREEN}http://localhost:8000/api${NC}"
echo ""
echo -e "${BLUE}Admin panel:${NC}"
echo -e "  ${GREEN}http://localhost:8000/admin${NC}"
echo ""
echo -e "${YELLOW}Demo Accounts:${NC}"
echo "  Patient: patient@example.com / Pass1234!"
echo "  Doctor: doctor@example.com / Pass1234!"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo "=========================================="
echo ""

python manage.py runserver
