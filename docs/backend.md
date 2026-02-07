# Backend Documentation

> Django REST Framework backend for PhD NexusCare healthcare platform.

---

## 📁 Project Structure

```
backend/
├── manage.py                # Django management commands
├── requirements.txt         # Python dependencies
├── pytest.ini              # Test configuration
├── db.sqlite3              # SQLite database (development)
├── nexuscare/              # Django project settings
│   ├── settings.py         # Configuration (JWT, CORS, AI)
│   ├── urls.py             # Main URL routing
│   ├── celery.py           # Celery configuration
│   ├── wsgi.py & asgi.py   # Server interfaces
├── apps/                   # Application modules
│   ├── users/              # Authentication & user management
│   ├── patients/           # Patient profiles
│   ├── doctors/            # Doctor profiles
│   ├── records/            # Medical records & files
│   ├── scheduling/         # Appointments system
│   ├── ai/                 # AI/ML features
│   ├── consent/            # Data sharing & consent
│   ├── billing/            # Billing (future)
│   └── notifications/      # Notifications (future)
├── data/                   # Training datasets
│   └── symptoms_train.csv  # Symptom-specialist training data
├── ai_models/              # Trained ML models
│   ├── specialist_clf_sklearn.joblib
│   ├── specialist_clf_pytorch.pt
│   └── *.json             # Label encoders
├── ai_index/               # FAISS vector indexes
│   └── faiss.index
└── media/                  # Uploaded files (organized by patient ID)
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate (Linux)
source .venv/bin/activate

# Install packages
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm
```

### 2. Install Tesseract OCR

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install tesseract-ocr
```

### 3. Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Key environment variables:**

```bash
DEBUG=1
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://localhost:8000

# Optional: Redis & Celery
USE_CELERY=0
REDIS_URL=redis://localhost:6379/0

# Email (console backend for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### 4. Initialize Database

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load demo data (optional)
python manage.py seed_demo
```

### 5. Train AI Models (Optional)

```bash
# Quick sklearn model (~30 seconds)
python manage.py train_sklearn

# Accurate PyTorch model (~5-15 minutes)
python manage.py train_pytorch --epochs 10
```

### 6. Run Development Server

```bash
python manage.py runserver
```

Access:

- **API**: http://localhost:8000/api
- **Admin**: http://localhost:8000/admin

---

## 📚 Core Features

### 1. Authentication & Authorization

**JWT-based authentication** with role-based access control.

**User Roles:**

- `patient` - Can manage own records, book appointments
- `doctor` - Can claim consent, view patient records
- `admin` - Full system access

**Endpoints:**

- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login (get JWT tokens)
- `POST /api/auth/refresh/` - Refresh access token
- `GET /api/auth/me/` - Get current user info
- `POST /api/auth/2fa/send/` - Send 2FA OTP
- `POST /api/auth/2fa/verify/` - Verify 2FA OTP

**JWT Tokens:**

- **Access Token**: Short-lived (1 hour), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access token

### 2. Consent Management

**Patient-controlled data sharing** with doctors.

**Flow:**

1. Patient grants consent with specific scope (which records to share)
2. System generates 6-digit OTP
3. Patient shares OTP with doctor (out-of-band)
4. Doctor claims consent with OTP
5. Doctor receives scoped JWT token with limited access

**Endpoints:**

- `POST /api/consent/grant/` - Patient grants consent
- `POST /api/consent/claim/` - Doctor claims with OTP
- `POST /api/consent/revoke/<id>/` - Patient revokes consent
- `GET /api/consent/audits/` - View audit logs (admin)

**Scoped Token Features:**

- Limited to specific patient data
- Limited to specific record types (labs, prescriptions, etc.)
- Automatic expiration (default 48 hours)
- Revocable by patient at any time

### 3. Medical Records

**Secure file storage** with signed URLs.

**File Types:**

- Lab Results
- Prescriptions
- Imaging (X-rays, MRIs)
- Clinical Encounters
- Other Documents

**Endpoints:**

- `POST /api/records/files/upload/` - Upload medical file
- `GET /api/records/files/` - List patient's files
- `GET /api/records/files/<id>/link/` - Get signed download URL
- `GET /api/records/summary/` - Get records overview
- `GET /api/records/labs/` - List lab results
- `GET /api/records/prescriptions/` - List prescriptions
- `GET /api/records/encounters/` - List encounters

**Security:**

- Files organized by patient ID in media folder
- Download URLs are HMAC-signed with 5-minute expiration
- Signature validation prevents unauthorized access
- Audit trail for all file access

### 4. AI/ML Services

See **[ai.md](ai.md)** for detailed AI documentation.

**Quick Overview:**

**Symptom Analysis:**

- Extracts medical entities using spaCy NER
- Identifies symptoms, medications, conditions
- `POST /api/symptoms/analyze/`

**Specialist Prediction:**

- Recommends specialist based on symptoms
- 75-85% accuracy (sklearn) or 85-95% (PyTorch)
- Returns confidence score
- `POST /api/ai/specialist/`

**Medical Summaries:**

- FAISS vector search for relevant records
- TextRank extractive summarization
- 5-10 bullet point summary
- `POST /api/ai/summary/`

**Model Status:**

- Check which models are trained
- `GET /api/ai/models/status/`

### 5. Scheduling System

**Appointment booking** with conflict detection.

**Features:**

- Doctor availability management (weekly schedules)
- 30-minute appointment slots
- Break time support
- Double-booking prevention
- Appointment cancellation

**Endpoints:**

- `GET /api/scheduling/doctors/<id>/slots/?date=YYYY-MM-DD` - Available slots
- `POST /api/scheduling/appointments/` - Book appointment
- `GET /api/scheduling/appointments/` - List appointments
- `PATCH /api/scheduling/appointments/<id>/` - Update status
- `DELETE /api/scheduling/appointments/<id>/` - Cancel appointment

**Appointment Statuses:**

- `scheduled` - Confirmed future appointment
- `completed` - Past appointment
- `cancelled` - Cancelled by patient or doctor
- `no-show` - Patient didn't attend

### 6. Doctor Discovery

**Search and filter doctors.**

**Endpoints:**

- `GET /api/doctors/` - List all doctors
- `GET /api/doctors/?specialty=Cardiology` - Filter by specialty
- `GET /api/doctors/?location=New York` - Filter by location
- `GET /api/doctors/<id>/` - Get doctor details

**Doctor Information:**

- Name, email, phone
- Specialty (Cardiology, Dermatology, etc.)
- Location
- Rating (1-5 stars)
- Qualifications, bio

### 7. Patient Profiles

**Manage patient information.**

**Endpoints:**

- `GET /api/patients/` - Get current patient profile
- `PUT /api/patients/` - Update profile
- `POST /api/patients/upload-photo/` - Upload profile photo

**Profile Fields:**

- Basic: Name, email, phone, date of birth
- Medical: Blood group, medical conditions, allergies
- Contact: Address
- Photo: Profile picture

### 8. Audit Logging

**Track all data access** for compliance.

**Logged Information:**

- Who accessed data (user ID, role)
- What was accessed (resource type, ID)
- When (timestamp)
- Why (purpose/action)
- How (IP address, user agent)

**Endpoint:**

- `GET /api/consent/audits/` - View audit logs (admin only)

---

## 🗄️ Database Models

### User Model

```python
class User(AbstractBaseUser):
    email = EmailField(unique=True)
    phone = CharField(max_length=15)
    role = CharField(choices=['patient', 'doctor', 'admin'])
    twofa_enabled = BooleanField(default=False)
    is_active = BooleanField(default=True)
    is_staff = BooleanField(default=False)
    created_at = DateTimeField(auto_now_add=True)
```

### Patient Model

```python
class Patient(Model):
    user = OneToOneField(User)
    name = CharField(max_length=100)
    dob = DateField(null=True)
    gender = CharField(choices=['M', 'F', 'O'])
    blood_group = CharField(max_length=5)
    address = TextField()
    medical_conditions = TextField()
    profile_photo = ImageField()
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Doctor Model

```python
class Doctor(Model):
    user = OneToOneField(User)
    name = CharField(max_length=100)
    specialty = CharField(max_length=100)
    qualification = CharField(max_length=200)
    location = CharField(max_length=100)
    rating = DecimalField(default=4.5)
    bio = TextField()
```

### MedicalFile Model

```python
class MedicalFile(Model):
    patient = ForeignKey(Patient)
    kind = CharField(choices=['lab', 'prescription', 'imaging', 'encounter', 'other'])
    filename = CharField(max_length=255)
    mime = CharField(max_length=100)
    size = IntegerField()
    notes = TextField()
    created_at = DateTimeField(auto_now_add=True)
```

### Appointment Model

```python
class Appointment(Model):
    patient = ForeignKey(Patient)
    doctor = ForeignKey(Doctor)
    slot_date = DateField()
    slot_time = TimeField()
    reason = TextField()
    status = CharField(choices=['scheduled', 'completed', 'cancelled', 'no-show'])
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('doctor', 'slot_date', 'slot_time')
```

### Consent Model

```python
class Consent(Model):
    patient = ForeignKey(Patient)
    doctor = ForeignKey(Doctor)
    otp_hash = CharField(max_length=255)
    scope = JSONField()  # {"read": ["labs", "prescriptions"]}
    status = CharField(choices=['pending', 'active', 'revoked', 'expired'])
    expires_at = DateTimeField()
    created_at = DateTimeField(auto_now_add=True)
```

---

## 🔐 Security Features

### Authentication

- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcrypt via Django's password hashers
- **2FA Support**: OTP via email (or SMS with Twilio)
- **Token Refresh**: Automatic token renewal

### Authorization

- **Role-Based Access**: Patient, Doctor, Admin roles
- **Scoped Tokens**: Limited access via consent system
- **Permission Classes**: DRF permissions per endpoint
- **Ownership Checks**: Users can only access their own data

### Data Protection

- **CORS**: Configured for trusted origins
- **CSRF**: Enabled for session-based requests
- **SQL Injection**: Protected by Django ORM
- **XSS**: Prevented by DRF serializers
- **File Signing**: HMAC-signed download URLs
- **Audit Logging**: Complete access trail

### Production Security

For production deployment:

```python
# settings.py
DEBUG = False
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
pytest

# Specific app
pytest apps/users/tests/

# With coverage
pytest --cov=apps --cov-report=html

# Verbose
pytest -v
```

### Test Structure

```
apps/users/tests/
├── test_models.py
├── test_views.py
├── test_serializers.py
└── test_permissions.py
```

### Example Test

```python
from rest_framework.test import APITestCase

class AuthenticationTest(APITestCase):
    def test_register_user(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'test@example.com',
            'password': 'Pass1234!',
            'password_confirm': 'Pass1234!',
            'role': 'patient'
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
```

---

## 📊 Management Commands

### Seed Demo Data

```bash
python manage.py seed_demo
```

Creates:

- 2 demo users (patient@example.com, doctor@example.com)
- 5 doctors with various specialties
- Sample medical records
- Sample appointments

### Train ML Models

```bash
# Scikit-learn model
python manage.py train_sklearn --data data/symptoms_train.csv

# PyTorch model
python manage.py train_pytorch --epochs 10 --batch-size 16

# Both models at once
./train_all_models.sh
```

### Build FAISS Index

```bash
# For specific patient
python manage.py build_index --patient 1

# For all patients
python manage.py build_index --all
```

### Database Migrations

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migrations
python manage.py showmigrations

# Rollback
python manage.py migrate app_name 0003_previous_migration
```

---

## 🔄 Optional: Redis & Celery

For background tasks (async emails, scheduled jobs).

### Start Redis & MailHog

```bash
cd docker
docker-compose -f docker-compose.dev.yml up -d
```

### Update .env

```bash
USE_CELERY=1
REDIS_URL=redis://localhost:6379/0
```

### Start Celery Worker

```bash
celery -A nexuscare worker -l INFO
```

### Start Celery Beat (Scheduler)

```bash
celery -A nexuscare beat -l INFO
```

### Example Celery Task

```python
from celery import shared_task

@shared_task
def send_appointment_reminder(appointment_id):
    # Send email reminder
    pass
```

---

## 🚀 Production Deployment

### Using PostgreSQL

```bash
# Install psycopg2
pip install psycopg2-binary

# Update .env
DATABASE_URL=postgresql://user:pass@localhost:5432/nexuscare
```

### Using Gunicorn

```bash
# Install
pip install gunicorn

# Run
gunicorn nexuscare.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

### Using Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /media/ {
        alias /path/to/media/;
    }

    location /static/ {
        alias /path/to/static/;
    }
}
```

### Using Docker

```bash
# Build
docker build -t nexuscare-backend .

# Run
docker run -p 8000:8000 nexuscare-backend
```

### Environment Variables for Production

```bash
DEBUG=0
SECRET_KEY=long-random-secret-key
DATABASE_URL=postgresql://...
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Email (use real SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=1
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Storage (use S3 for production)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_STORAGE_BUCKET_NAME=nexuscare-media
```

---

## 📖 API Documentation

### Full API Reference

See **API_DOCS.md** in the backend folder for complete endpoint documentation with request/response examples.

### Quick API Overview

**Authentication:**

- `POST /api/auth/register/` - Register
- `POST /api/auth/login/` - Login
- `POST /api/auth/refresh/` - Refresh token
- `GET /api/auth/me/` - Current user

**Consent:**

- `POST /api/consent/grant/` - Grant consent
- `POST /api/consent/claim/` - Claim consent
- `POST /api/consent/revoke/<id>/` - Revoke consent

**Records:**

- `POST /api/records/files/upload/` - Upload file
- `GET /api/records/files/` - List files
- `GET /api/records/files/<id>/link/` - Download link
- `GET /api/records/summary/` - Records summary

**AI:**

- `POST /api/symptoms/analyze/` - Analyze symptoms
- `POST /api/ai/specialist/` - Predict specialist
- `POST /api/ai/summary/` - Generate summary
- `GET /api/ai/models/status/` - Model status

**Scheduling:**

- `GET /api/scheduling/doctors/<id>/slots/` - Available slots
- `POST /api/scheduling/appointments/` - Book appointment
- `GET /api/scheduling/appointments/` - List appointments

**Doctors:**

- `GET /api/doctors/` - List doctors
- `GET /api/doctors/<id>/` - Doctor details

**Patients:**

- `GET /api/patients/` - Get profile
- `PUT /api/patients/` - Update profile
- `POST /api/patients/upload-photo/` - Upload photo

### API Testing

**Using curl:**

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"Pass1234!"}'

# Use token
curl http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Using Postman:**

1. Import collection from `postman_collection.json`
2. Set environment variables (base_url, access_token)
3. Run requests

**Using Django Admin:**

- Browse API at: http://localhost:8000/api/ (with DRF browsable API)

---

## 🛠️ Troubleshooting

### Database Issues

**Problem**: `no such table` error

```bash
# Solution: Run migrations
python manage.py migrate
```

**Problem**: Migration conflicts

```bash
# Solution: Reset migrations (dev only!)
rm db.sqlite3
python manage.py migrate
```

### Module Import Errors

**Problem**: `ModuleNotFoundError`

```bash
# Solution: Install dependencies
pip install -r requirements.txt
```

### Tesseract Not Found

**Problem**: `TesseractNotFoundError`

```bash
# Linux (Ubuntu/Debian)
sudo apt-get install tesseract-ocr
```

### Port Already in Use

**Problem**: `Error: That port is already in use`

```bash
# Find process using port 8000
lsof -i :8000

# Kill process or use different port
python manage.py runserver 8001
```

### CORS Errors

**Problem**: Frontend can't access API

```python
# settings.py - add your frontend URL
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "http://localhost:3000",  # Add your port
]
```

---

## 📚 Dependencies

Main packages (from requirements.txt):

```
Django==5.0.1
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
Pillow==10.1.0
python-dotenv==1.0.0

# AI/ML
spacy==3.7.2
scikit-learn==1.3.2
torch==2.1.1
transformers==4.35.2
sentence-transformers==2.2.2
faiss-cpu==1.7.4
pytesseract==0.3.10

# Optional
celery==5.3.4
redis==5.0.1
psycopg2-binary==2.9.9
gunicorn==21.2.0
```

---

## 🎓 Learning Resources

- **Django Docs**: https://docs.djangoproject.com/
- **DRF Docs**: https://www.django-rest-framework.org/
- **JWT**: https://django-rest-framework-simplejwt.readthedocs.io/
- **Celery**: https://docs.celeryproject.org/

---

**Built with Django 5.0 and Django REST Framework. Ready for production deployment!**
