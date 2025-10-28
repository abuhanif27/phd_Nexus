# PhD NexusCare Backend

Local, offline-first medical records and AI platform.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install Tesseract OCR
# Ubuntu/Debian: sudo apt-get install tesseract-ocr
# macOS: brew install tesseract
# Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki

# 4. Download spaCy model
python -m spacy download en_core_web_sm

# 5. Set up environment
cp .env.example .env

# 6. Initialize database
python manage.py migrate

# 7. Create superuser
python manage.py createsuperuser

# 8. Seed demo data
python manage.py seed_demo

# 9. Train specialist classifier
python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib

# 10. Build patient index
python manage.py build_index --patient 1

# 11. Run server
python manage.py runserver
```

## Optional: Redis & Celery

```bash
# Start Redis and MailHog
cd docker
docker-compose -f docker-compose.dev.yml up -d

# Update .env
USE_CELERY=1

# Start Celery worker
celery -A nexuscare worker -l INFO

# Start Celery beat (for scheduled tasks)
celery -A nexuscare beat -l INFO
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/2fa/send` - Send 2FA OTP
- `POST /api/auth/2fa/verify` - Verify 2FA OTP
- `GET /api/auth/me` - Get current user

### Consent

- `POST /api/consent/grant` - Patient grants consent to doctor
- `POST /api/consent/claim` - Doctor claims consent with OTP
- `POST /api/consent/revoke/<id>/` - Revoke consent
- `GET /api/consent/audits` - View audit logs (admin)

### Files & Records

- `POST /api/records/files/upload/` - Upload medical file
- `GET /api/records/files/<id>/link/` - Get signed download link
- `GET /api/records/summary/` - Patient records summary
- `GET /api/records/labs/` - List lab results
- `GET /api/records/prescriptions/` - List prescriptions
- `GET /api/records/encounters/` - List encounters

### AI Services

- `POST /api/symptoms/analyze/` - Analyze symptoms with NLP
- `POST /api/ai/specialist/` - Predict specialist
- `POST /api/ai/summary/` - Generate patient summary
- `POST /api/ai/build-index/` - Build FAISS index

### Doctors & Scheduling

- `GET /api/doctors/` - List doctors (filter by specialty, location)
- `GET /api/scheduling/doctors/<id>/slots/?date=YYYY-MM-DD` - Available slots
- `POST /api/scheduling/appointments/` - Book appointment
- `PATCH /api/scheduling/appointments/<id>/` - Update appointment
- `PATCH /api/scheduling/appointments/<id>/cancel/` - Cancel appointment

### Billing (Stub)

- `GET /api/billing/invoices/` - List invoices
- `POST /api/billing/payments/checkout/` - Create checkout
- `POST /api/billing/webhooks/payment/` - Payment webhook

## Demo Credentials

After running `seed_demo`:

- **Patient:** patient@example.com / Pass1234!
- **Doctor:** doctor@example.com / Pass1234!

## Features

✅ JWT authentication with 2FA (OTP via console)  
✅ Role-based access control (Patient, Doctor, Admin)  
✅ Scoped consent tokens for doctor access  
✅ Local file storage with HMAC-signed URLs  
✅ OCR processing with Tesseract  
✅ Symptom analysis with spaCy NER  
✅ Specialist prediction with scikit-learn  
✅ RAG-like summarization with FAISS + TextRank  
✅ Appointment scheduling with conflict detection  
✅ Audit logging for all data access  
✅ SQLite database (zero setup)  
✅ 100% offline capable

## Stack

- Django 5 + Django REST Framework
- SQLite (local database)
- JWT authentication (SimpleJWT)
- spaCy (NLP/NER)
- SentenceTransformers (embeddings)
- FAISS (vector search)
- scikit-learn (classification)
- Sumy (extractive summarization)
- Tesseract OCR
- Celery + Redis (optional background tasks)

## Development

```bash
# Run tests
pytest

# Create new app
python manage.py startapp myapp

# Make migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Shell
python manage.py shell
```

## Project Structure

```
backend/
├── nexuscare/          # Project settings
├── apps/
│   ├── users/          # Auth, roles, 2FA
│   ├── consent/        # Scoped JWT, audit
│   ├── patients/       # Patient profiles
│   ├── doctors/        # Doctor profiles
│   ├── records/        # Files, labs, prescriptions
│   ├── scheduling/     # Appointments
│   ├── billing/        # Invoices (stub)
│   ├── notifications/  # Email/SMS (mock)
│   └── ai/             # ML/NLP services
├── data/               # Training data
├── ai_models/          # Trained models
├── ai_index/           # FAISS indexes
└── media/              # Uploaded files
```

## License

MIT
