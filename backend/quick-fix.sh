#!/bin/bash

# Quick Fix Script for Common Issues
# Run this if you encounter setup problems

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "PhD NexusCare - Quick Fix Script"
echo "=========================================="
echo ""

# Ensure we're in the backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Working directory: $SCRIPT_DIR"
echo ""

# Fix 1: Check Python installation
echo "${YELLOW}[1/10] Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo "${RED}✗ Python 3 not found!${NC}"
    echo "Install: sudo apt install python3 python3-venv python3-pip (Ubuntu/Debian)"
    exit 1
fi
python_version=$(python3 --version)
echo "${GREEN}✓ $python_version${NC}"

# Fix 2: Ensure requirements.txt exists
echo "${YELLOW}[2/10] Checking requirements.txt...${NC}"
if [ ! -f "requirements.txt" ]; then
    echo "${YELLOW}⚠ requirements.txt not found in backend directory${NC}"
    if [ -f "../requirements.txt" ]; then
        echo "Copying from parent directory..."
        cp ../requirements.txt .
        echo "${GREEN}✓ Fixed${NC}"
    else
        echo "${RED}✗ Cannot find requirements.txt${NC}"
        exit 1
    fi
else
    echo "${GREEN}✓ Found${NC}"
fi

# Fix 3: Virtual environment
echo "${YELLOW}[3/10] Checking virtual environment...${NC}"
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
    echo "${GREEN}✓ Created${NC}"
else
    echo "${GREEN}✓ Exists${NC}"
fi

# Activate venv
source .venv/bin/activate

# Fix 4: Upgrade pip
echo "${YELLOW}[4/10] Upgrading pip...${NC}"
pip install --upgrade pip -q
echo "${GREEN}✓ Done${NC}"

# Fix 5: Install dependencies
echo "${YELLOW}[5/10] Installing dependencies...${NC}"
pip install -r requirements.txt -q
echo "${GREEN}✓ Installed${NC}"

# Fix 6: Check Tesseract (optional but warn)
echo "${YELLOW}[6/10] Checking Tesseract OCR...${NC}"
if command -v tesseract &> /dev/null; then
    echo "${GREEN}✓ Installed${NC}"
else
    echo "${YELLOW}⚠ Tesseract not found (OCR features will not work)${NC}"
    echo "  Install: sudo apt-get install tesseract-ocr"
fi

# Fix 7: Download spaCy model
echo "${YELLOW}[7/10] Checking spaCy model...${NC}"
if python -c "import spacy; spacy.load('en_core_web_sm')" 2>/dev/null; then
    echo "${GREEN}✓ Model loaded${NC}"
else
    echo "Downloading spaCy model..."
    python -m spacy download en_core_web_sm
    echo "${GREEN}✓ Downloaded${NC}"
fi

# Fix 8: Create .env file
echo "${YELLOW}[8/10] Checking environment file...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "${GREEN}✓ Created from .env.example${NC}"
    else
        echo "${YELLOW}⚠ Creating minimal .env file${NC}"
        cat > .env << EOF
DJANGO_SECRET=dev-secret-$(openssl rand -hex 16)
DEBUG=1
ALLOWED_HOSTS=127.0.0.1,localhost
JWT_ACCESS_MIN=15
JWT_REFRESH_DAYS=30
MEDIA_ROOT=./media
MEDIA_URL=/media/
REDIS_URL=redis://localhost:6379/0
USE_CELERY=0
FAISS_INDEX_PATH=./ai_index/faiss.index
SYMPTOM_MODEL_PATH=./ai_models/specialist_clf.joblib
SPACY_MODEL=en_core_web_sm
EOF
        echo "${GREEN}✓ Created${NC}"
    fi
else
    echo "${GREEN}✓ Exists${NC}"
fi

# Fix 9: Create directories
echo "${YELLOW}[9/10] Creating required directories...${NC}"
mkdir -p media ai_models ai_index
chmod -R 755 media ai_models ai_index 2>/dev/null || true
echo "${GREEN}✓ Created${NC}"

# Fix 10: Database migrations
echo "${YELLOW}[10/10] Running database migrations...${NC}"
if [ -f "db.sqlite3" ]; then
    echo "${YELLOW}⚠ Database already exists${NC}"
    echo "Do you want to reset the database? (y/N)"
    read -r reset_db
    if [ "$reset_db" = "y" ] || [ "$reset_db" = "Y" ]; then
        rm db.sqlite3
        echo "Database removed"
    fi
fi

python manage.py makemigrations 2>/dev/null || echo "${YELLOW}Note: No new migrations${NC}"
python manage.py migrate
echo "${GREEN}✓ Migrations applied${NC}"

# Summary
echo ""
echo "=========================================="
echo "${GREEN}Quick Fix Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. ${YELLOW}python manage.py seed_demo${NC}  # Create demo data"
echo "  2. ${YELLOW}python manage.py createsuperuser${NC}  # Create admin account"
echo "  3. ${YELLOW}python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib${NC}"
echo "  4. ${YELLOW}python manage.py runserver${NC}  # Start the server"
echo ""
echo "If you still have issues, check ${YELLOW}TROUBLESHOOTING.md${NC}"
echo ""
