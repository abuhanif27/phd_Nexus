# AGENTS.md

Purpose: shared context for coding agents working in this repository.

## 1) Project Summary

PhD NexusCare is a full-stack healthcare platform with:
- Patient/doctor management
- Medical records and scheduling
- Billing flows
- Consent and audit features
- AI-assisted symptom/specialist analysis

Architecture is split:
- Backend: Django REST API (SQLite in local dev)
- Frontend: Next.js (React + TypeScript)

The frontend and backend are separate applications, but they are part of one product and must stay API-compatible.

## 2) Tech Stack

Backend:
- Django 5
- Django REST Framework
- SimpleJWT authentication
- Celery + Redis (async/background tasks)
- scikit-learn, spaCy, FAISS, NLP utilities

Frontend:
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- Vitest + Playwright

## 3) Repository Layout

- backend/: Django apps, API, AI services, migrations, tests
- frontend/: Next.js app router UI, feature modules, client state, API clients
- docs/: project structure and domain docs
- docker/: local container setup files
- start-all.(sh|ps1), stop-all.(sh|ps1): convenience scripts

Key backend app modules include:
- apps/ai
- apps/consent
- apps/patients
- apps/doctors
- apps/records
- apps/scheduling
- apps/billing
- apps/users

## 4) Local Runbook

Windows (PowerShell):
- Start all: ./start-all.ps1
- Stop all: ./stop-all.ps1

Linux/macOS:
- Start all: ./start-all.sh
- Stop all: ./stop-all.sh

Direct backend run:
- cd backend
- activate venv
- python manage.py migrate
- python manage.py runserver

Direct frontend run:
- cd frontend
- npm install
- npm run dev

Default ports:
- Frontend: 3000
- Backend: 8000

## 5) Required AI Setup

AI classifier artifacts are expected for AI endpoints.
If missing, train at least the sklearn model:
- cd backend
- activate venv
- python manage.py train_sklearn

## 6) Environment and API Contract

Frontend env handling defaults to local backend:
- NEXT_PUBLIC_API_BASE_URL defaults to http://localhost:8000

API base path is /api on backend.
Auth is JWT Bearer token.

When changing API serializers/views/routes, verify frontend API usage and types remain compatible.

## 7) How Agents Should Interpret Requests

When a user asks for a change, classify first:
- frontend-only UI/UX change
- backend-only business/API change
- cross-cutting change affecting contracts
- AI/model/training/runtime change
- infra/dev-experience change

Then apply this rule:
- If any API shape may change, check both backend endpoint definitions and frontend callers/types.

## 8) Clarification Checklist (Ask If Missing)

Before implementing ambiguous requests, ask for:
- Scope: frontend, backend, or both?
- Expected behavior: exact input/output examples
- Target users/roles: patient, doctor, admin, staff
- Backward compatibility requirement
- Whether DB schema changes are allowed
- Whether AI behavior must be deterministic or can be heuristic

If the request is simple and clear, implement directly without extra questions.

## 9) Safe Change Policy

- Keep changes minimal and scoped.
- Do not rename public API fields unless requested.
- Prefer additive API changes over breaking changes.
- Preserve existing auth/permission checks.
- For Django model changes, create migrations.
- For frontend behavior changes, check loading/error states.

## 10) Validation Checklist

Backend:
- Run relevant Django tests (or targeted pytest)
- Validate endpoint behavior manually if tests are missing

Frontend:
- npm run typecheck
- npm run lint
- run targeted unit/e2e tests when relevant

Cross-stack:
- Confirm frontend can still authenticate and call modified endpoints.

## 11) Common Request Patterns

"Fix UI issue":
- inspect feature module in frontend/features/*
- verify component usage in app routes
- avoid changing backend unless needed

"API not working":
- inspect backend app urls/views/serializers first
- inspect frontend lib/api client usage second
- confirm base URL and auth token handling

"AI prediction issue":
- verify model files exist
- verify AI services/tasks import path and fallback logic
- verify request payload/response schema

## 12) Definition of Done

A task is done when:
- requested behavior is implemented
- no obvious regressions introduced
- impacted checks/tests are run (or explicitly reported if not run)
- assumptions and limitations are clearly stated in the final update
