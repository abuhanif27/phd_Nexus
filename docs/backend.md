# Backend

Django REST API. Apps: users, patients, doctors, records, scheduling, ai, consent, billing, notifications.

## Quick start

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cp .env.example .env   # edit if needed
python manage.py migrate
python manage.py runserver
```

Tesseract: `sudo apt-get install tesseract-ocr`

## Key paths

- Settings: `nexuscare/settings.py` (CORS, JWT, DB)
- API routes: `nexuscare/urls.py` + each app’s `urls.py`
- Models: `apps/<app>/models.py`

## API

Base: `http://localhost:8000/api`. Auth: JWT (Bearer token). Full reference: [backend/API_DOCS.md](../backend/API_DOCS.md).
