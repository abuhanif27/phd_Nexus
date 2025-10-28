# Quick Start Guide - PhD NexusCare Backend

This guide will get you up and running in under 5 minutes.

## Prerequisites

- Python 3.11+
- Tesseract OCR (for document processing)
- Git

## Installation

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Run Setup Script (Linux/Mac)

```bash
chmod +x setup.sh
./setup.sh
```

The setup script will:

- Create virtual environment
- Install all dependencies
- Download NLP models
- Initialize database
- Seed demo data
- Train AI classifier
- Build search index

### 3. Manual Setup (Windows or if script fails)

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Install Tesseract OCR
# Download from: https://github.com/UB-Mannheim/tesseract/wiki

# Download spaCy model
python -m spacy download en_core_web_sm

# Setup environment
copy .env.example .env  # Windows
# cp .env.example .env  # Mac/Linux

# Initialize database
python manage.py migrate

# Seed demo data
python manage.py seed_demo

# Train classifier
python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib

# Build index
python manage.py build_index --patient 1
```

## Start the Server

```bash
# Activate virtual environment (if not already activated)
source .venv/bin/activate  # Mac/Linux
# .venv\Scripts\activate  # Windows

# Start Django development server
python manage.py runserver
```

Server will be available at: **http://localhost:8000**

## Test the API

### 1. Login as Patient

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Pass1234!"
  }'
```

Save the `access` token from the response.

### 2. Get Your Profile

```bash
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Analyze Symptoms

```bash
curl -X POST http://localhost:8000/api/symptoms/analyze/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Severe chest pain with shortness of breath"
  }'
```

### 4. Predict Specialist

```bash
curl -X POST http://localhost:8000/api/ai/specialist/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Severe chest pain with shortness of breath"
  }'
```

Should return: `"specialist": "Cardiology"`

### 5. Get Medical Summary

```bash
curl -X POST http://localhost:8000/api/ai/summary/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1
  }'
```

## Demo Accounts

After running `seed_demo`:

**Patient Account:**

- Email: `patient@example.com`
- Password: `Pass1234!`

**Doctor Account:**

- Email: `doctor@example.com`
- Password: `Pass1234!`

## Access Admin Panel

1. Create superuser (if not done during setup):

```bash
python manage.py createsuperuser
```

2. Visit: **http://localhost:8000/admin/**

3. Login with your superuser credentials

## Common Tasks

### View All Endpoints

Visit the API root: **http://localhost:8000/api/**

### Run Tests

```bash
pytest
```

### Check Database

```bash
python manage.py dbshell
```

### Django Shell

```bash
python manage.py shell
```

## Optional: Background Jobs with Celery

### 1. Start Redis

```bash
cd docker
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Update .env

```
USE_CELERY=1
```

### 3. Start Celery Worker

```bash
celery -A nexuscare worker -l INFO
```

### 4. Start Celery Beat (for scheduled tasks)

```bash
celery -A nexuscare beat -l INFO
```

## Troubleshooting

### "Module not found" errors

Make sure virtual environment is activated:

```bash
source .venv/bin/activate  # Mac/Linux
.venv\Scripts\activate  # Windows
```

### Tesseract not found

Install Tesseract OCR:

- **Ubuntu/Debian:** `sudo apt-get install tesseract-ocr`
- **macOS:** `brew install tesseract`
- **Windows:** Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

### Database errors

Reset database:

```bash
rm db.sqlite3
python manage.py migrate
python manage.py seed_demo
```

### Port 8000 already in use

Use a different port:

```bash
python manage.py runserver 8001
```

## Next Steps

- Read [API_DOCS.md](API_DOCS.md) for complete API documentation
- Read [README.md](README.md) for detailed feature list
- Explore the admin panel at `/admin/`
- Try the consent flow (patient grants, doctor claims)
- Upload test files and trigger OCR processing

## Getting Help

- Check the README.md for detailed documentation
- Review API_DOCS.md for endpoint specifications
- Inspect the code in `apps/` directory
- Check Django logs for error messages

## Success Criteria

You should be able to:

- ✅ Login as patient/doctor
- ✅ Analyze symptoms and get specialist recommendations
- ✅ Generate patient medical summaries
- ✅ Upload files and get signed download links
- ✅ Book appointments with conflict detection
- ✅ Grant and claim consent with OTP flow

Congratulations! Your PhD NexusCare backend is ready! 🎉
