# Setup (Linux)

## Prerequisites

- Python 3.10+, Node 18+
- Tesseract: `sudo apt-get install tesseract-ocr`

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py seed_demo          # optional
```

Or use script: `./setup.sh`

## Train AI (required)

```bash
cd backend && source .venv/bin/activate
python manage.py train_sklearn   # ~1 min, good accuracy
# or: python manage.py train_pytorch --epochs 10  # longer, higher accuracy
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Run

- Backend: `cd backend && source .venv/bin/activate && python manage.py runserver`
- Or: `./start-all.sh` (starts both)
- Stop: `./stop-all.sh`

**URLs:** Frontend http://localhost:3000 | API http://localhost:8000/api | Admin http://localhost:8000/admin

## Troubleshooting

- **Port in use:** `lsof -ti:8000 | xargs kill -9` or `lsof -ti:3000 | xargs kill -9`
- **python not found:** use `python3`
- **No trained classifier:** run `python manage.py train_sklearn` in backend
