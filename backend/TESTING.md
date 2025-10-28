# Testing Guide - PhD NexusCare Backend

This guide covers testing the complete backend functionality.

## Running Tests

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=apps --cov-report=html
```

### Run Specific Test File

```bash
pytest tests/test_api.py
```

### Run Specific Test

```bash
pytest tests/test_api.py::test_user_login
```

---

## Manual Testing Workflows

### 1. Complete Auth Flow

```bash
# Register new user
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!",
    "role": "patient"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'

# Save the access token
export TOKEN="<access_token>"

# Get profile
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Consent Flow (Patient → Doctor)

```bash
# Login as patient
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Pass1234!"
  }'

export PATIENT_TOKEN="<access_token>"

# Grant consent to doctor (ID=2)
curl -X POST http://localhost:8000/api/consent/grant/ \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor_id": 2,
    "scope": {"read": ["labs", "prescriptions", "encounters"]},
    "duration_hours": 48
  }'

# Note the OTP printed in server console

# Login as doctor
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@example.com",
    "password": "Pass1234!"
  }'

export DOCTOR_TOKEN="<access_token>"

# Claim consent with OTP
curl -X POST http://localhost:8000/api/consent/claim/ \
  -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "otp": "123456"
  }'

# Save scoped token
export SCOPED_TOKEN="<scoped_token>"

# Now doctor can access patient records (with scoped token)
```

### 3. File Upload & Signed Links

```bash
# Login as patient
export PATIENT_TOKEN="<access_token>"

# Upload a file
curl -X POST http://localhost:8000/api/records/files/upload/ \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -F "file=@test_lab.pdf" \
  -F "kind=lab"

# Get signed download link
curl -X GET http://localhost:8000/api/records/files/1/link/ \
  -H "Authorization: Bearer $PATIENT_TOKEN"

# Download file using signed URL
curl -O "<signed_url>"
```

### 4. AI/ML Features

```bash
# Analyze symptoms
curl -X POST http://localhost:8000/api/symptoms/analyze/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Severe headache for 2 days, taking ibuprofen, sensitive to light"
  }'

# Predict specialist
curl -X POST http://localhost:8000/api/ai/specialist/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Chest pain with shortness of breath and sweating"
  }'
# Should predict: Cardiology

curl -X POST http://localhost:8000/api/ai/specialist/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Ear pain with hearing loss and ringing"
  }'
# Should predict: ENT

# Generate patient summary
curl -X POST http://localhost:8000/api/ai/summary/ \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1
  }'
```

### 5. Doctor Discovery & Scheduling

```bash
# Search for doctors
curl -X GET "http://localhost:8000/api/doctors/?specialty=Cardiology" \
  -H "Authorization: Bearer $TOKEN"

# Get available slots
curl -X GET "http://localhost:8000/api/scheduling/doctors/2/slots/?date=2025-10-30" \
  -H "Authorization: Bearer $TOKEN"

# Book appointment
curl -X POST http://localhost:8000/api/scheduling/appointments/ \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": 2,
    "patient": 1,
    "date": "2025-10-30",
    "start_time": "09:00",
    "end_time": "09:30",
    "notes": "Follow-up consultation"
  }'

# Try to double-book (should fail with 409)
curl -X POST http://localhost:8000/api/scheduling/appointments/ \
  -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctor": 2,
    "patient": 1,
    "date": "2025-10-30",
    "start_time": "09:00",
    "end_time": "09:30"
  }'

# Cancel appointment
curl -X PATCH http://localhost:8000/api/scheduling/appointments/1/cancel/ \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

### 6. Medical Records

```bash
# Get records summary
curl -X GET http://localhost:8000/api/records/summary/ \
  -H "Authorization: Bearer $PATIENT_TOKEN"

# List lab results
curl -X GET http://localhost:8000/api/records/labs/ \
  -H "Authorization: Bearer $PATIENT_TOKEN"

# List prescriptions
curl -X GET http://localhost:8000/api/records/prescriptions/ \
  -H "Authorization: Bearer $PATIENT_TOKEN"

# List encounters
curl -X GET http://localhost:8000/api/records/encounters/ \
  -H "Authorization: Bearer $PATIENT_TOKEN"
```

---

## Acceptance Tests

### ✅ Auth & Security

- [ ] Registration creates user and returns JWT
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails (401)
- [ ] Protected endpoints reject unauthenticated requests
- [ ] JWT refresh works
- [ ] 2FA OTP send/verify works

### ✅ Consent Management

- [ ] Patient can grant consent to doctor
- [ ] OTP is generated and logged to console
- [ ] Doctor can claim consent with valid OTP
- [ ] Doctor receives scoped JWT with correct permissions
- [ ] Doctor cannot claim consent with invalid OTP
- [ ] Patient can revoke consent
- [ ] All accesses logged in audit trail

### ✅ File Management

- [ ] Patient can upload files
- [ ] Files stored under correct patient directory
- [ ] Signed links generated with expiration
- [ ] Signed links work before expiration
- [ ] Signed links fail after expiration
- [ ] File metadata stored correctly

### ✅ OCR Processing

- [ ] Lab PDF upload triggers OCR task
- [ ] Text extracted from image/PDF
- [ ] Structured data extracted (test values)
- [ ] LabResult created with extracted data

### ✅ AI/ML Features

- [ ] Symptom analysis extracts entities
- [ ] Specialist prediction returns correct specialty
- [ ] Confidence threshold applied (< 0.6 → GP)
- [ ] Test cases:
  - "chest pain" → Cardiology (>0.8 confidence)
  - "ear pain" → ENT (>0.7 confidence)
  - "headache" → Neurology (>0.7 confidence)
- [ ] Patient summary generated with citations
- [ ] Summary contains 5-10 bullet points
- [ ] Generation completes under 3 seconds

### ✅ Scheduling

- [ ] Available slots calculated correctly
- [ ] Breaks excluded from available slots
- [ ] Booked slots excluded from available slots
- [ ] Appointment booking succeeds for available slot
- [ ] Double-booking prevented (409 Conflict)
- [ ] Appointment cancellation works

### ✅ Offline Operation

- [ ] All features work without internet
- [ ] No external API calls
- [ ] Email notifications logged to console
- [ ] SMS notifications logged to console
- [ ] Payments are stubbed

---

## Performance Tests

### Load Testing with Apache Bench

```bash
# Test login endpoint
ab -n 100 -c 10 -T 'application/json' \
  -p login.json \
  http://localhost:8000/api/auth/login/

# Test symptom analysis
ab -n 50 -c 5 -T 'application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -p symptom.json \
  http://localhost:8000/api/symptoms/analyze/
```

**Expected Performance:**

- Login: < 100ms per request
- Symptom analysis: < 500ms per request
- Specialist prediction: < 800ms per request
- Patient summary: < 2.5s per request

---

## Database Integrity Tests

```bash
# Enter Django shell
python manage.py shell

# Run integrity checks
from apps.users.models import User
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.records.models import File, LabResult

# Check user count
print(f"Users: {User.objects.count()}")

# Check patient profiles
print(f"Patients: {Patient.objects.count()}")

# Check doctor profiles
print(f"Doctors: {Doctor.objects.count()}")

# Check files
print(f"Files: {File.objects.count()}")

# Check lab results
print(f"Lab Results: {LabResult.objects.count()}")
```

---

## Security Tests

### 1. JWT Expiration

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "patient@example.com", "password": "Pass1234!"}'

# Wait for JWT_ACCESS_MIN minutes (default 15)
# Try to access protected endpoint
# Should return 401 Unauthorized
```

### 2. Role-Based Access

```bash
# Login as patient
export PATIENT_TOKEN="<patient_token>"

# Try to access doctor-only endpoint
curl -X GET http://localhost:8000/api/admin/audits/ \
  -H "Authorization: Bearer $PATIENT_TOKEN"
# Should return 403 Forbidden
```

### 3. Consent Scope Enforcement

```bash
# Grant consent with limited scope (only "labs")
# Try to access prescriptions with scoped token
# Should be denied (requires proper implementation in view)
```

---

## CI/CD Test Commands

Add to your CI pipeline:

```bash
# Install dependencies
pip install -r requirements.txt

# Run linting
flake8 apps/

# Run tests with coverage
pytest --cov=apps --cov-report=xml --cov-report=term

# Check migrations
python manage.py makemigrations --check --dry-run

# Collect static files
python manage.py collectstatic --noinput

# Run system checks
python manage.py check --deploy
```

---

## Troubleshooting Tests

### Tests failing with import errors

```bash
# Make sure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Database locked errors

```bash
# Close all connections to test database
# Or use a separate test database:
pytest --create-db
```

### ML model not found errors

```bash
# Train the model
python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib

# Download spaCy model
python -m spacy download en_core_web_sm
```

---

## Test Coverage Goals

Aim for:

- **Overall:** > 80%
- **Critical paths (auth, consent):** > 90%
- **AI/ML services:** > 70%
- **Views:** > 85%
- **Models:** > 95%

Check coverage:

```bash
pytest --cov=apps --cov-report=html
open htmlcov/index.html
```
