# PhD NexusCare API Documentation

Base URL: `http://localhost:8000/api`

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Authentication

### Register

**POST** `/auth/register/`

Create a new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "password_confirm": "SecurePass123!",
  "role": "patient"
}
```

**Response (201):**

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "patient",
    "twofa_enabled": false
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Login

**POST** `/auth/login/`

Authenticate and receive JWT tokens.

**Request:**

```json
{
  "email": "patient@example.com",
  "password": "Pass1234!"
}
```

**Response (200):**

```json
{
  "user": {
    "id": 1,
    "email": "patient@example.com",
    "role": "patient"
  },
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Refresh Token

**POST** `/auth/refresh/`

Get a new access token using refresh token.

**Request:**

```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Current User

**GET** `/auth/me/`

Get authenticated user info.

**Response (200):**

```json
{
  "id": 1,
  "email": "patient@example.com",
  "role": "patient",
  "twofa_enabled": false
}
```

---

## Consent Management

### Grant Consent

**POST** `/consent/grant/`

_Patient only_ - Grant data access to a doctor.

**Request:**

```json
{
  "doctor_id": 2,
  "scope": {
    "read": ["labs", "prescriptions", "encounters"]
  },
  "duration_hours": 48
}
```

**Response (201):**

```json
{
  "consent_id": 1,
  "otp_last4": "5678",
  "message": "Consent created. Share OTP with doctor."
}
```

### Claim Consent

**POST** `/consent/claim/`

_Doctor only_ - Claim consent using OTP and receive scoped token.

**Request:**

```json
{
  "otp": "123456"
}
```

**Response (200):**

```json
{
  "scoped_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "consent": {
    "id": 1,
    "patient": 1,
    "doctor": 2,
    "scope": { "read": ["labs", "prescriptions"] },
    "expires_at": "2025-10-31T12:00:00Z",
    "status": "active"
  }
}
```

### Revoke Consent

**POST** `/consent/revoke/<consent_id>/`

_Patient only_ - Revoke a previously granted consent.

**Response (200):**

```json
{
  "message": "Consent revoked"
}
```

---

## Medical Records

### Upload File

**POST** `/records/files/upload/`

_Patient only_ - Upload a medical document.

**Request (multipart/form-data):**

- `file`: File upload
- `kind`: "lab", "prescription", "encounter", or "other"

**Response (201):**

```json
{
  "id": 1,
  "patient": 1,
  "kind": "lab",
  "filename": "lab_result.pdf",
  "mime": "application/pdf",
  "size": 245678,
  "created_at": "2025-10-29T10:00:00Z"
}
```

### Get Signed File Link

**GET** `/records/files/<file_id>/link/`

Get a short-lived signed URL to download a file.

**Response (200):**

```json
{
  "url": "http://localhost:8000/media/1/lab_result.pdf?sig=abc123&exp=1698585600",
  "expires_in": 300
}
```

### Records Summary

**GET** `/records/summary/`

_Patient only_ - Get latest records overview.

**Response (200):**

```json
{
  "labs": [...],
  "prescriptions": [...],
  "encounters": [...]
}
```

---

## AI Services

### Analyze Symptoms

**POST** `/symptoms/analyze/`

Analyze symptom text with NLP.

**Request:**

```json
{
  "text": "Severe headache for 2 days, taking ibuprofen"
}
```

**Response (200):**

```json
{
  "cleaned_text": "severe headache for 2 days taking ibuprofen",
  "entities": [
    {
      "text": "headache",
      "label": "SYMPTOM",
      "start": 7,
      "end": 15
    }
  ]
}
```

### Predict Specialist

**POST** `/ai/specialist/`

Predict which specialist to consult.

**Request:**

```json
{
  "text": "Crushing chest pain, sweating, breathless"
}
```

**Response (200):**

```json
{
  "specialist": "Cardiology",
  "confidence": 0.91
}
```

### Generate Patient Summary

**POST** `/ai/summary/`

Generate extractive summary of patient records.

**Request:**

```json
{
  "patient_id": 1
}
```

**Response (200):**

```json
{
  "bullets": [
    "HbA1c trending up since last visit",
    "Blood pressure well controlled on current medication",
    "Cholesterol levels within normal range"
  ],
  "citations": [
    { "type": "lab", "id": 5 },
    { "type": "prescription", "id": 3 },
    { "type": "encounter", "id": 12 }
  ]
}
```

---

## Doctors & Scheduling

### List Doctors

**GET** `/doctors/?specialty=Cardiology&location=New%20York`

Search for doctors.

**Query Parameters:**

- `specialty` (optional): Filter by specialty
- `location` (optional): Filter by location

**Response (200):**

```json
{
  "count": 1,
  "results": [
    {
      "id": 2,
      "email": "doctor@example.com",
      "name": "Dr. Sarah Smith",
      "specialty": "Cardiology",
      "qualifications": "MD, Board Certified",
      "location": "New York, NY",
      "rating": 4.8
    }
  ]
}
```

### Get Available Slots

**GET** `/scheduling/doctors/<doctor_id>/slots/?date=2025-10-30`

Get available appointment slots for a doctor on a specific date.

**Response (200):**

```json
{
  "date": "2025-10-30",
  "doctor_id": 2,
  "slots": [
    {
      "start_time": "09:00",
      "end_time": "09:30",
      "available": true
    },
    {
      "start_time": "09:30",
      "end_time": "10:00",
      "available": true
    }
  ]
}
```

### Book Appointment

**POST** `/scheduling/appointments/`

Book an appointment.

**Request:**

```json
{
  "doctor": 2,
  "patient": 1,
  "date": "2025-10-30",
  "start_time": "09:00",
  "end_time": "09:30",
  "notes": "Follow-up consultation"
}
```

**Response (201):**

```json
{
  "id": 1,
  "doctor": 2,
  "patient": 1,
  "date": "2025-10-30",
  "start_time": "09:00:00",
  "end_time": "09:30:00",
  "status": "scheduled",
  "notes": "Follow-up consultation",
  "created_at": "2025-10-29T10:00:00Z"
}
```

### Cancel Appointment

**PATCH** `/scheduling/appointments/<appointment_id>/cancel/`

Cancel an appointment.

**Response (200):**

```json
{
  "id": 1,
  "status": "canceled",
  ...
}
```

---

## Billing (Stub)

### List Invoices

**GET** `/billing/invoices/`

List invoices for the authenticated user.

### Create Checkout

**POST** `/billing/payments/checkout/`

Create a payment checkout session (stub).

**Request:**

```json
{
  "invoice_id": 1
}
```

**Response (200):**

```json
{
  "payment_url": "http://localhost:8000/api/billing/mock-payment/1",
  "invoice_id": 1,
  "amount": 150.0,
  "currency": "USD"
}
```

---

## Error Responses

All endpoints may return error responses:

**400 Bad Request:**

```json
{
  "error": "Invalid input data",
  "details": {...}
}
```

**401 Unauthorized:**

```json
{
  "detail": "Authentication credentials were not provided."
}
```

**403 Forbidden:**

```json
{
  "error": "Access denied"
}
```

**404 Not Found:**

```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**

```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

No rate limiting is enforced in the local development environment.

## Pagination

List endpoints support pagination:

- Default page size: 20 items
- Use `?page=2` to access subsequent pages

---

## Testing with cURL

### Example: Login

```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Pass1234!"
  }'
```

### Example: Authenticated Request

```bash
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Example: Upload File

```bash
curl -X POST http://localhost:8000/api/records/files/upload/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/file.pdf" \
  -F "kind=lab"
```
