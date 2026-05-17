# API reference

Base: `http://localhost:8000/api`. Auth: `Authorization: Bearer <access_token>` (from login/register).

## Auth (`/api/auth/`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register/` | Register (body: email, phone, password, password_confirm, role) |
| POST | `/login/` | Login (email, password) → access + refresh |
| POST | `/refresh/` | Body `{"refresh": "..."}` → new access |
| GET | `/me/` | Current user |
| POST | `/2fa/send/` | Send 2FA code |
| POST | `/2fa/verify/` | Verify 2FA |

## Consent (`/api/consent/`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/grant/` | Grant consent |
| POST | `/claim/` | Claim consent |
| POST | `/revoke/<id>/` | Revoke consent |
| GET | `/audits/` | Audit logs |

## Patients, Doctors, Service Providers, Records, Scheduling

REST resources under `/api/patients/`, `/api/doctors/`, `/api/service-providers/`, `/api/records/`, `/api/scheduling/` (list, create, retrieve, update, delete by id where supported). Extra:

- **Service Providers:** GET `/api/service-providers/services/`, POST `/api/service-providers/services/` for approved providers, admin approval under `/api/service-providers/approvals/`
- **Records:** POST `/api/records/files/upload/`, GET `/api/records/files/<id>/link/`, GET `/api/records/summary/`
- **Scheduling:** GET `/api/scheduling/doctors/<id>/slots/`

## AI (`/api/`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ai/specialist/` | Body `{"text": "symptoms"}` → specialist |
| POST | `/ai/analyze-enhanced/` | Enhanced analysis |
| POST | `/ai/summary/` | Text summary |
| GET | `/ai/patient-summary/` | Patient summary |
| POST | `/symptoms/analyze/` | Symptom analysis |
| GET | `/health-analysis/` | Health analysis |
| GET | `/models/status/` | Model status |
| POST | `/ai/build-index/` | Build FAISS index |

Errors: 4xx/5xx JSON with `detail` or field errors.
