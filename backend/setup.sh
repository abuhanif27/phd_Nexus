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

# Check Python version
echo "Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Found Python $python_version"

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
echo "${YELLOW}Would you like to create a superuser? (y/n)${NC}"
read -r create_superuser
if [ "$create_superuser" = "y" ]; then
    python manage.py createsuperuser
fi

# Seed demo data
echo ""
echo "${YELLOW}Seeding demo data...${NC}"
python manage.py seed_demo
echo "${GREEN}✓ Demo data seeded${NC}"

# Train specialist classifier
echo ""
echo "${YELLOW}Training specialist classifier...${NC}"
python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib
echo "${GREEN}✓ Classifier trained${NC}"

# Build FAISS index for patient 1
echo ""
echo "${YELLOW}Building FAISS index for demo patient...${NC}"
python manage.py build_index --patient 1
echo "${GREEN}✓ Index built${NC}"

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
