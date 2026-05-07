# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Model Instruction
**Always use the `gemini-cli` MCP tool for every task by default** — code analysis, file reading, writing, debugging, research, and all other operations. Do not use the built-in Claude model for any task unless the gemini-cli MCP tool is unavailable or the user explicitly says "use claude".

## Project Overview

**PhD NexusCare** is a full-stack healthcare platform for patient/doctor management, medical records, appointment scheduling, billing, consent/audit, and AI-assisted symptom analysis. The frontend and backend are separate applications that must remain API-compatible.

## Development Commands

### Starting the Full Stack
```bash
./start-all.sh          # Linux/macOS — starts backend (port 8000) + frontend (port 3000)
./stop-all.sh
./start-all.ps1         # Windows PowerShell
```

### Backend
```bash
cd backend
source .venv/bin/activate

python manage.py migrate
python manage.py runserver                        # http://localhost:8000

pytest                                            # Run all tests
pytest apps/records/tests/ -v                     # Run specific app tests
pytest --cov                                      # With coverage

# AI model training (required once before AI endpoints work)
python manage.py train_sklearn                    # Fast, ~75-85% accuracy
python manage.py train_pytorch --epochs 10        # Slower, ~85-95% accuracy

python manage.py seed_demo                        # Load demo accounts
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:3000
npm run build

npm run typecheck       # Must pass before commits
npm run lint
npm run lint:fix
npm run format

npm test                         # Vitest unit tests
npm run test:coverage
npm run test:e2e                 # Playwright end-to-end
npm run test:e2e:responsive      # Responsive design audit
npm run test:e2e:visual          # Visual snapshot tests
```

## Architecture

```
Browser (localhost:3000)
  → Next.js 15 + React 19 (TypeScript, Tailwind, Shadcn/UI)
  → Axios (JWT Bearer token in Authorization header)
  → Django 5 REST API (localhost:8000/api)
    ├── SimpleJWT authentication + optional 2FA (pyotp)
    ├── 8 Django apps: users, patients, doctors, records,
    │   scheduling, billing, notifications, ai, consent
    ├── SQLite (local dev, db.sqlite3)
    └── Celery + Redis (optional background tasks, USE_CELERY=1)
          → AI services: scikit-learn classifier, spaCy NER,
            FAISS vector search, Tesseract OCR
```

### Frontend Structure
- `app/` — Next.js app router; route groups `(auth)` and `(protected)`
- `features/` — Self-contained feature modules (each has its own API client, hooks, components)
- `components/ui/` — Reusable Shadcn/UI primitives
- `lib/api/` — Axios client with JWT interceptors
- `lib/queryClient.ts` — TanStack Query config
- Zustand for client state, TanStack Query for server state

### Backend Structure
- `nexuscare/settings.py` — JWT, CORS, INSTALLED_APPS, SQLite config
- `nexuscare/urls.py` — Top-level API router
- `apps/<name>/` — Each app has models, serializers, views, urls, tests
- `apps/ai/` — ML inference, health summaries, OCR, spaCy NER
- `ai_models/` — Trained model artifacts (`.joblib`, `.pt`) — not in git

## Environment Setup

Backend (`backend/.env`):
```env
DJANGO_SECRET=your-secret-key
DEBUG=1
ALLOWED_HOSTS=127.0.0.1,localhost
REDIS_URL=redis://localhost:6379/0
USE_CELERY=0
MEDIA_ROOT=./media
FAISS_INDEX_PATH=./ai_index/faiss.index
SYMPTOM_MODEL_PATH=./ai_models/specialist_clf.joblib
SPACY_MODEL=en_core_web_sm
```

Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=NexusCare
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_ENABLE_MSW=false
```

## Key Constraints

**API contract:** When changing backend serializers/views/routes, always verify frontend API clients and TypeScript types remain compatible. Prefer additive API changes; do not rename public API fields unless required.

**AI models:** `python manage.py train_sklearn` must be run at least once before AI endpoints (`/api/ai/`, `/api/health/`) will function. Model files are not committed to git.

**Django model changes:** Always create a migration (`python manage.py makemigrations`).

**Frontend type safety:** Always run `npm run typecheck` before considering frontend work complete.

**Auth flow:** Frontend injects JWT via Axios interceptor (`lib/api/`). Backend permission classes guard all non-public endpoints. Do not remove or weaken permission checks.

**OCR dependency:** Tesseract must be installed at OS level (`apt-get install tesseract-ocr`); it is not a Python package.

**Celery is optional:** Basic operation works without it. Enable with `USE_CELERY=1` and a running Redis instance.

## Demo Accounts (after `seed_demo`)

```
Patient:  patient@example.com / TestPass123!
Doctor:   doctor@example.com / TestPass123!
Admin:    admin@example.com / admin
```

## Classifying Changes

Before implementing, identify the change type:
- **Frontend-only** — UI/UX, feature modules in `features/`, routes in `app/`
- **Backend-only** — Business logic, serializers, models, permissions
- **Cross-cutting** — Any API shape change requires updating both sides
- **AI/model** — Verify model files exist; check `apps/ai/` services and fallback logic
- **Infra/dev-experience** — docker, env vars, scripts

## Additional Documentation

- `AGENTS.md` — Agent operating guidelines and safe change policy
- `SETUP.md` — Full first-time setup walkthrough
- `backend/API_DOCS.md` — Complete API reference
- `docs/ai.md` — AI model training and endpoint details
- `docs/frontend.md` / `docs/backend.md` — Domain-specific quick starts
