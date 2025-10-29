# 🔧 Troubleshooting Guide

Common issues and their solutions for PhD NexusCare Backend.

## Setup Issues

### 1. `python -m venv` command not found (Exit Code 127)

**Problem:** The `python` or `python3` command is not in your PATH, or Python is not installed.

**Solutions:**

```bash
# Check if Python 3 is installed
python3 --version

# If not installed:
# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-venv python3-pip

# macOS (using Homebrew)
brew install python3

# Fedora/RHEL
sudo dnf install python3 python3-pip
```

### 2. Virtual Environment Not Activating

**Problem:** `.venv/bin/activate` file not found or permission denied.

**Solutions:**

```bash
# Make sure you're in the backend directory
cd /home/hn-hanif/Desktop/phd_Nexus/backend

# Remove old venv and recreate
rm -rf .venv
python3 -m venv .venv

# Activate (Linux/Mac)
source .venv/bin/activate

# Verify activation (should show .venv path)
which python
```

### 3. Requirements Installation Fails

**Problem:** `pip install -r requirements.txt` errors.

**Solutions:**

```bash
# Upgrade pip first
pip install --upgrade pip setuptools wheel

# Install dependencies one by one to find the culprit
pip install Django==5.0.1
pip install djangorestframework==3.14.0
# ... etc

# Or use verbose mode
pip install -r requirements.txt -v

# Check for system dependencies
# Some packages need build tools:
# Ubuntu/Debian
sudo apt install build-essential python3-dev

# macOS
xcode-select --install
```

### 4. Tesseract OCR Not Found

**Problem:** `tesseract: command not found`

**Solutions:**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr libtesseract-dev

# macOS
brew install tesseract

# Fedora
sudo dnf install tesseract

# Verify installation
tesseract --version
```

### 5. spaCy Model Download Fails

**Problem:** `python -m spacy download en_core_web_sm` fails.

**Solutions:**

```bash
# Try direct download
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl

# Or download to a specific location
python -m spacy download en_core_web_sm --user

# Verify
python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('OK')"
```

---

## Database Issues

### 1. `createsuperuser` Command Fails

**Problem:** Error when running `python manage.py createsuperuser`

**Solutions:**

```bash
# Make sure migrations are run first
python manage.py migrate

# Create superuser with email only (no username)
python manage.py createsuperuser

# Enter email when prompted (NOT username)
# Example: admin@example.com

# If interactive mode fails, use environment variables
DJANGO_SUPERUSER_EMAIL=admin@example.com \
DJANGO_SUPERUSER_PASSWORD=AdminPass123! \
python manage.py createsuperuser --noinput

# Or use Django shell
python manage.py shell
```

Then in the shell:

```python
from apps.users.models import User
admin = User.objects.create_superuser(
    email='admin@example.com',
    password='AdminPass123!'
)
print(f"Superuser created: {admin.email}")
```

### 2. Migration Errors

**Problem:** `python manage.py migrate` fails with table already exists or other errors.

**Solutions:**

```bash
# Reset database (CAUTION: deletes all data)
rm db.sqlite3
rm -rf */migrations/00*.py
rm -rf */migrations/__pycache__

# Recreate migrations
python manage.py makemigrations
python manage.py migrate

# If specific app fails, migrate individually
python manage.py migrate users
python manage.py migrate consent
python manage.py migrate patients
# etc...

# Check migration status
python manage.py showmigrations
```

### 3. `AUTH_USER_MODEL` Errors

**Problem:** Error about User model not matching AUTH_USER_MODEL.

**Solution:**

```bash
# This typically happens if you change AUTH_USER_MODEL after initial migration
# MUST reset database
rm db.sqlite3
python manage.py migrate
```

---

## Runtime Issues

### 1. Import Errors When Running Server

**Problem:** `ModuleNotFoundError: No module named 'django'` or similar

**Solutions:**

```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Verify Python is from venv
which python
# Should show: /path/to/backend/.venv/bin/python

# Reinstall requirements if needed
pip install -r requirements.txt

# Check installed packages
pip list | grep -i django
```

### 2. Permission Denied Errors

**Problem:** Cannot write to media folder or create directories.

**Solutions:**

```bash
# Fix permissions
chmod -R 755 media ai_models ai_index

# Or create with proper permissions
mkdir -p media ai_models ai_index
sudo chown -R $USER:$USER media ai_models ai_index
```

### 3. Port Already in Use

**Problem:** `Error: That port is already in use.`

**Solutions:**

```bash
# Use a different port
python manage.py runserver 8001

# Or kill the process using port 8000
# Linux/Mac
lsof -ti:8000 | xargs kill -9

# Or find and kill
ps aux | grep runserver
kill -9 <PID>
```

### 4. Celery/Redis Connection Errors

**Problem:** Celery cannot connect to Redis.

**Solutions:**

```bash
# If not using Celery, disable it in .env
USE_CELERY=0

# If using Celery, start Redis first
cd docker
docker-compose -f docker-compose.dev.yml up -d redis

# Check Redis is running
redis-cli ping
# Should return: PONG

# Test Redis connection
python manage.py shell
```

Then in shell:

```python
import redis
r = redis.Redis(host='localhost', port=6379, db=0)
r.ping()  # Should return True
```

---

## AI/ML Issues

### 1. Specialist Classifier Training Fails

**Problem:** `train_specialist` command errors.

**Solutions:**

```bash
# Check training data exists
ls -la data/symptoms_train.csv

# Verify CSV format (should have 'text,label' header)
head -5 data/symptoms_train.csv

# Try training manually
python manage.py shell
```

In shell:

```python
import pandas as pd
df = pd.read_csv('data/symptoms_train.csv')
print(df.head())
print(df['label'].value_counts())

# If no errors, try training again
exit()
python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib
```

### 2. FAISS Index Building Fails

**Problem:** `build_index` command errors.

**Solutions:**

```bash
# Make sure patient exists
python manage.py shell -c "from apps.patients.models import Patient; print(Patient.objects.all())"

# Ensure patient has data (labs, prescriptions, etc.)
python manage.py seed_demo  # This creates sample data

# Try building index manually
python manage.py build_index --patient 1

# Check if FAISS is properly installed
python -c "import faiss; print('FAISS OK')"
```

### 3. spaCy Model Not Found at Runtime

**Problem:** `OSError: [E050] Can't find model 'en_core_web_sm'`

**Solutions:**

```bash
# Download model again
python -m spacy download en_core_web_sm

# Link model
python -m spacy link en_core_web_sm en_core_web_sm

# Verify in Python
python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('Model loaded')"

# If still fails, install directly
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1-py3-none-any.whl
```

---

## API Issues

### 1. 401 Unauthorized Errors

**Problem:** All API requests return 401.

**Solutions:**

```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"patient@example.com","password":"Pass1234!"}'

# If login works, extract token:
TOKEN="<access_token_from_response>"

# Use token in subsequent requests
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer $TOKEN"
```

### 2. CORS Errors in Browser

**Problem:** Browser shows CORS policy errors.

**Solutions:**
In `nexuscare/settings.py`, check:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",  # Add if testing from same origin
]

CORS_ALLOW_CREDENTIALS = True
```

Or temporarily allow all (DEV ONLY):

```python
CORS_ALLOW_ALL_ORIGINS = True  # Only for development!
```

### 3. JWT Token Expired

**Problem:** Token suddenly stops working.

**Solutions:**

```bash
# Tokens expire after 15 minutes by default
# Use refresh token to get new access token

curl -X POST http://localhost:8000/api/auth/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh":"<your_refresh_token>"}'

# Adjust token lifetime in .env if needed
JWT_ACCESS_MIN=30  # 30 minutes
JWT_REFRESH_DAYS=60  # 60 days
```

---

## Testing Issues

### 1. pytest Cannot Find Modules

**Problem:** `ModuleNotFoundError` when running pytest.

**Solutions:**

```bash
# Install test dependencies
pip install pytest pytest-django

# Verify pytest is installed
pytest --version

# Run from backend directory
cd /home/hn-hanif/Desktop/phd_Nexus/backend
pytest

# Or specify settings explicitly
DJANGO_SETTINGS_MODULE=nexuscare.settings pytest

# Check pytest.ini configuration
cat pytest.ini
```

### 2. Tests Fail with Database Errors

**Problem:** Tests cannot create/access test database.

**Solutions:**

```bash
# Django creates test database automatically
# Make sure you have write permissions

# Run with verbose output
pytest -v

# Run specific test
pytest tests/test_api.py::test_register

# Clean up test database
rm test_db.sqlite3
```

---

## Performance Issues

### 1. Slow API Responses

**Problem:** API endpoints take too long.

**Diagnostics:**

```bash
# Enable SQL query logging in settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}

# Use Django Debug Toolbar (add to INSTALLED_APPS)
pip install django-debug-toolbar
```

**Solutions:**

- Add database indexes
- Use select_related() and prefetch_related()
- Cache ML models in memory
- Enable Redis caching

### 2. Large File Upload Issues

**Problem:** File uploads timeout or fail.

**Solutions:**
In `nexuscare/settings.py`:

```python
# Increase max upload size (default 2.5MB)
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10MB

# For larger files, use streaming
FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]
```

---

## Emergency Reset

If all else fails, complete reset:

```bash
cd /home/hn-hanif/Desktop/phd_Nexus/backend

# 1. Deactivate and remove virtual environment
deactivate 2>/dev/null || true
rm -rf .venv

# 2. Remove database and generated files
rm -f db.sqlite3
rm -rf ai_models/*.joblib ai_models/*.json
rm -rf ai_index/*.index
rm -rf media/*
rm -rf */migrations/00*.py
rm -rf **/__pycache__

# 3. Fresh setup
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 4. Initialize database
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo
python manage.py train_specialist --in data/symptoms_train.csv --out ai_models/specialist_clf.joblib
python manage.py build_index --patient 1

# 5. Create superuser
python manage.py createsuperuser

# 6. Run server
python manage.py runserver
```

---

## Getting Help

### Check Django Error Pages

When DEBUG=True, Django shows detailed error pages with:

- Full traceback
- Local variables
- SQL queries executed
- Request information

### Use Django Shell for Debugging

```bash
python manage.py shell
```

```python
# Test imports
from apps.users.models import User
from apps.patients.models import Patient

# Check database
User.objects.all()
Patient.objects.all()

# Test functions
from apps.ai.services import AIService
ai = AIService()
result = ai.analyze_symptoms("I have a headache")
print(result)
```

### Enable Verbose Logging

In `.env`:

```bash
DEBUG=1
```

In `settings.py`, add:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

---

## Still Having Issues?

1. Check Django version compatibility
2. Verify Python version (3.8+)
3. Review Django logs carefully
4. Test each component individually
5. Check system resource usage (disk space, memory)
6. Verify file permissions

**Pro Tips:**

- Always activate virtual environment first
- Run migrations after model changes
- Clear browser cache for API testing
- Use Postman or curl for API debugging
- Keep dependencies updated
