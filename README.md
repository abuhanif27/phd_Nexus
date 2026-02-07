# PhD NexusCare

Medical records + appointments, AI symptom analysis. Runs locally (Linux).

**Stack:** Django REST API, React/Next.js frontend, SQLite, scikit-learn/PyTorch for specialist prediction.

## Prerequisites

- Python 3.10+, Node 18+, Tesseract OCR
- Linux: `sudo apt-get install tesseract-ocr`

## Quick start

```bash
./start-all.sh
# Frontend: http://localhost:3000   Backend: http://localhost:8000
```

First time: train AI models (required):

```bash
cd backend && source .venv/bin/activate && python manage.py train_sklearn
```

## Setup

See [SETUP.md](SETUP.md). Summary: backend (`cd backend && ./setup.sh` or venv + migrate + train), frontend (`cd frontend && npm install && npm run dev`).

## Docs

- [SETUP.md](SETUP.md) – full setup
- [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) – layout
- [docs/backend.md](docs/backend.md) – API / backend
- [docs/ai.md](docs/ai.md) – AI models
- [backend/API_DOCS.md](backend/API_DOCS.md) – API reference

Demo: `patient@example.com` / `Pass1234!`
