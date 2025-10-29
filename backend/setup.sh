#!/bin/bash

# PhD NexusCare Backend Setup Script
# This script sets up the complete backend environment

set -e  # Exit on error

echo "=========================================="
echo "PhD NexusCare Backend Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ensure we're in the backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Working directory: $SCRIPT_DIR"
echo ""

# Check Python version
echo "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "${RED}✗ Python 3 is not installed${NC}"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "${GREEN}✓ Found Python $python_version${NC}"
echo ""

# Create virtual environment
if [ ! -d ".venv" ]; then
    echo "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
    echo "${GREEN}✓ Virtual environment created${NC}"
else
    echo "${GREEN}✓ Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Upgrade pip
echo "${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "${RED}✗ requirements.txt not found!${NC}"
    echo "Please ensure requirements.txt is in the backend directory"
    exit 1
fi

# Install dependencies
echo "${YELLOW}Installing Python dependencies...${NC}"
pip install -r requirements.txt
echo "${GREEN}✓ Dependencies installed${NC}"

# Check for Tesseract
echo ""
echo "Checking for Tesseract OCR..."
if command -v tesseract &> /dev/null; then
    tesseract_version=$(tesseract --version 2>&1 | head -n 1)
    echo "${GREEN}✓ $tesseract_version${NC}"
else
    echo "${RED}✗ Tesseract not found${NC}"
    echo "Please install Tesseract:"
    echo "  Ubuntu/Debian: sudo apt-get install tesseract-ocr"
    echo "  macOS: brew install tesseract"
    echo "  Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki"
fi

# Download spaCy model
echo ""
echo "${YELLOW}Downloading spaCy model...${NC}"
python -m spacy download en_core_web_sm
echo "${GREEN}✓ spaCy model downloaded${NC}"

# Set up environment file
echo ""
if [ ! -f ".env" ]; then
    echo "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo "${GREEN}✓ .env file created${NC}"
    echo "${YELLOW}Note: Edit .env file if you need custom settings${NC}"
else
    echo "${GREEN}✓ .env file already exists${NC}"
fi

# Create directories
echo ""
echo "${YELLOW}Creating required directories...${NC}"
mkdir -p media ai_models ai_index
echo "${GREEN}✓ Directories created${NC}"

# Run migrations
echo ""
echo "${YELLOW}Running database migrations...${NC}"
python manage.py migrate
echo "${GREEN}✓ Database initialized${NC}"

# Create superuser prompt
echo ""
echo "${YELLOW}Would you like to create a superuser/admin account? (y/n)${NC}"
read -r create_superuser
if [ "$create_superuser" = "y" ] || [ "$create_superuser" = "Y" ]; then
    echo "${YELLOW}Creating superuser...${NC}"
    echo "You'll be prompted to enter email and password"
    python manage.py createsuperuser --email --noinput 2>/dev/null || python manage.py createsuperuser
    echo "${GREEN}✓ Superuser created${NC}"
fi

# Seed demo data
echo ""
echo "${YELLOW}Seeding demo data...${NC}"
python manage.py seed_demo
echo "${GREEN}✓ Demo data seeded${NC}"

# Train specialist classifier
echo ""
echo "${YELLOW}Training specialist classifier...${NC}"
if [ -f "data/symptoms_train.csv" ]; then
    python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib
    echo "${GREEN}✓ Classifier trained${NC}"
else
    echo "${RED}✗ Training data not found at data/symptoms_train.csv${NC}"
    echo "Skipping classifier training"
fi

# Build FAISS index for patient 1
echo ""
echo "${YELLOW}Building FAISS index for demo patient...${NC}"
# Check if patient exists first
patient_count=$(python manage.py shell -c "from apps.patients.models import Patient; print(Patient.objects.count())" 2>/dev/null || echo "0")
if [ "$patient_count" -gt 0 ]; then
    python manage.py build_index --patient 1 2>/dev/null || echo "${YELLOW}Note: Index building may require patient data. Skipping for now.${NC}"
    echo "${GREEN}✓ Index build attempted${NC}"
else
    echo "${YELLOW}Note: No patients found. Skipping index building.${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Demo Credentials:"
echo "  Patient: patient@example.com / Pass1234!"
echo "  Doctor: doctor@example.com / Pass1234!"
echo ""
echo "To start the server:"
echo "  ${YELLOW}source .venv/bin/activate${NC}"
echo "  ${YELLOW}python manage.py runserver${NC}"
echo ""
echo "Optional - Start Redis & Celery:"
echo "  ${YELLOW}cd docker && docker-compose -f docker-compose.dev.yml up -d${NC}"
echo "  ${YELLOW}celery -A nexuscare worker -l INFO${NC}"
echo ""
echo "API will be available at: http://localhost:8000/api/"
echo "Admin panel: http://localhost:8000/admin/"
echo ""
