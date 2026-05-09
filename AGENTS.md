# Repository Guidelines

## Project Structure & Module Organization

PhD NexusCare is split into two API-compatible applications:

- `backend/`: Django 5 REST API, app modules, migrations, and backend tests.
- `frontend/`: Next.js 15 React/TypeScript app, UI, feature modules, API clients, and tests.
- `docs/`: product and domain documentation.
- `docker/`: local container setup.
- `start-all.sh` / `stop-all.sh`: convenience scripts for running both apps.

Key backend apps live under `backend/apps/`, including `ai`, `consent`, `patients`, `doctors`, `records`, `scheduling`, `billing`, and `users`. Frontend features are under `frontend/features/*`; app routes live in `frontend/app`.

## Build, Test, and Development Commands

- `./start-all.sh`: start the local full stack.
- `./stop-all.sh`: stop local services.
- `cd backend && python manage.py migrate`: apply Django migrations.
- `cd backend && python manage.py runserver`: run the API on port `8000`.
- `cd backend && python manage.py train_sklearn`: create local AI classifier artifacts if missing.
- `cd frontend && npm run dev`: run Next.js on port `3000`.
- `cd frontend && npm run build`: create a production frontend build.
- `cd frontend && npm run typecheck`: run TypeScript checks.
- `cd frontend && npm run lint`: run ESLint.

## Coding Style & Naming Conventions

Backend code follows Django conventions: app-local `models.py`, `serializers.py`, `views.py`, `urls.py`, and migrations in `migrations/`. Preserve existing permission checks and prefer additive API changes.

Frontend uses TypeScript, React function components, Tailwind CSS, and feature folders. Use PascalCase for components, camelCase for variables/functions, and keep API types in `frontend/types` or feature API modules.

## Testing Guidelines

Backend changes should run relevant Django tests from `backend/`; add tests near the impacted app when behavior changes. Frontend uses Vitest and Playwright:

- `cd frontend && npm test`: unit tests.
- `cd frontend && npm run test:e2e`: Playwright end-to-end tests.

For cross-stack API changes, verify backend serializers/views and frontend callers/types together.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style messages, for example `feat: enhance LoginForm...`. Prefer `feat:`, `fix:`, `chore:`, or `docs:`.

Pull requests should include a short description, linked issue when available, screenshots for UI changes, migration notes for schema changes, and the exact checks run.

## Security & Configuration Tips

Do not commit secrets or local tokens. Frontend API calls default to `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`; backend auth uses JWT Bearer tokens. Keep patient data, consent, and audit behavior backward-compatible unless explicitly required.
