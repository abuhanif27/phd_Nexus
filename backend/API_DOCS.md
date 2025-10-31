# PhD NexusCare API Documentation

Base URL: `http://localhost:8000/api`Base URL: `http://localhost:8000/api`

All authenticated endpoints require a Bearer token in the Authorization header:All authenticated endpoints require a Bearer token in the Authorization header:

```

Authorization: Bearer <access_token>Authorization: Bearer <access_token>

```

---

## Table of Contents## Authentication

1. [Authentication](#authentication)### Register

2. [Consent Management](#consent-management)

3. [Patient Profiles](#patient-profiles)**POST** `/auth/register/`

4. [Doctors](#doctors)

5. [Medical Records](#medical-records)Create a new user account.

6. [Scheduling & Appointments](#scheduling--appointments)

7. [AI Services](#ai-services)**Request:**

8. [Billing](#billing)

9. [Error Responses](#error-responses)```json

{

--- "email": "user@example.com",

"phone": "+1234567890",

## Authentication "password": "SecurePass123!",

"password_confirm": "SecurePass123!",

### Register New User "role": "patient"

}

**POST** `/auth/register/````

Create a new user account.**Response (201):**

**Request Body:**```json

{

````json "user": {

{    "id": 1,

  "email": "user@example.com",    "email": "user@example.com",

  "phone": "+1234567890",    "role": "patient",

  "password": "SecurePass123!",    "twofa_enabled": false

  "password_confirm": "SecurePass123!",  },

  "role": "patient"  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",

}  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."

```}

````

**Parameters:**

- `email` (string, required) - Valid email address### Login

- `phone` (string, required) - Phone number with country code

- `password` (string, required) - Min 8 chars, must include letters and numbers**POST** `/auth/login/`

- `password_confirm` (string, required) - Must match password

- `role` (string, required) - Either "patient" or "doctor"Authenticate and receive JWT tokens.

**Response (201 Created):\*\***Request:\*\*

`json`json

{{

"user": { "email": "patient@example.com",

    "id": 1,  "password": "Pass1234!"

    "email": "user@example.com",}

    "role": "patient",```

    "twofa_enabled": false

},**Response (200):**

"access": "eyJ0eXAiOiJKV1QiLCJhbGc...",

"refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."```json

}{

```"user": {

    "id": 1,

**Errors:**    "email": "patient@example.com",

- `400` - Validation errors (email exists, passwords don't match, etc.)    "role": "patient"

  },

---  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",

  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."

### Login}

```

**POST** `/auth/login/`

### Refresh Token

Authenticate and receive JWT tokens.

**POST** `/auth/refresh/`

**Request Body:**

Get a new access token using refresh token.

````json

{**Request:**

  "email": "patient@example.com",

  "password": "Pass1234!"```json

}{

```  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."

}

**Response (200 OK):**```



```json### Get Current User

{

  "user": {**GET** `/auth/me/`

    "id": 1,

    "email": "patient@example.com",Get authenticated user info.

    "role": "patient",

    "twofa_enabled": false**Response (200):**

  },

  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",```json

  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."{

}  "id": 1,

```  "email": "patient@example.com",

  "role": "patient",

**Errors:**  "twofa_enabled": false

- `401` - Invalid credentials}

- `400` - Missing email or password```



------



### Refresh Token## Consent Management



**POST** `/auth/refresh/`### Grant Consent



Get a new access token using refresh token.**POST** `/consent/grant/`



**Request Body:**_Patient only_ - Grant data access to a doctor.



```json**Request:**

{

  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."```json

}{

```  "doctor_id": 2,

  "scope": {

**Response (200 OK):**    "read": ["labs", "prescriptions", "encounters"]

  },

```json  "duration_hours": 48

{}

  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."```

}

```**Response (201):**



**Errors:**```json

- `401` - Invalid or expired refresh token{

  "consent_id": 1,

---  "otp_last4": "5678",

  "message": "Consent created. Share OTP with doctor."

### Get Current User}

````

**GET** `/auth/me/`

### Claim Consent

Get authenticated user information.

**POST** `/consent/claim/`

**Headers:**

`````_Doctor only_ - Claim consent using OTP and receive scoped token.

Authorization: Bearer <access_token>

```**Request:**



**Response (200 OK):**```json

{

```json  "otp": "123456"

{}

  "id": 1,```

  "email": "patient@example.com",

  "phone": "+1234567890",**Response (200):**

  "role": "patient",

  "twofa_enabled": false,```json

  "is_active": true{

}  "scoped_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",

```  "consent": {

    "id": 1,

**Errors:**    "patient": 1,

- `401` - Not authenticated    "doctor": 2,

    "scope": { "read": ["labs", "prescriptions"] },

---    "expires_at": "2025-10-31T12:00:00Z",

    "status": "active"

### Send 2FA OTP  }

}

**POST** `/auth/2fa/send/````



Send a 2FA OTP to user's email.### Revoke Consent



**Headers:****POST** `/consent/revoke/<consent_id>/`

`````

Authorization: Bearer <access*token>\_Patient only* - Revoke a previously granted consent.

````

**Response (200):**

**Request Body:**

```json

```json{

{  "message": "Consent revoked"

  "purpose": "login"}

}```

````

---

**Response (200 OK):**

## Medical Records

````json

{### Upload File

  "message": "OTP sent to email",

  "otp_last4": "5678"**POST** `/records/files/upload/`

}

```_Patient only_ - Upload a medical document.



**Errors:****Request (multipart/form-data):**

- `401` - Not authenticated

- `429` - Too many OTP requests- `file`: File upload

- `kind`: "lab", "prescription", "encounter", or "other"

---

**Response (201):**

### Verify 2FA OTP

```json

**POST** `/auth/2fa/verify/`{

  "id": 1,

Verify OTP code.  "patient": 1,

  "kind": "lab",

**Headers:**  "filename": "lab_result.pdf",

```  "mime": "application/pdf",

Authorization: Bearer <access_token>  "size": 245678,

```  "created_at": "2025-10-29T10:00:00Z"

}

**Request Body:**```



```json### Get Signed File Link

{

  "otp": "123456"**GET** `/records/files/<file_id>/link/`

}

```Get a short-lived signed URL to download a file.



**Response (200 OK):****Response (200):**



```json```json

{{

  "message": "OTP verified",  "url": "http://localhost:8000/media/1/lab_result.pdf?sig=abc123&exp=1698585600",

  "verified": true  "expires_in": 300

}}

````

**Errors:**### Records Summary

- `400` - Invalid or expired OTP

- `401` - Not authenticated**GET** `/records/summary/`

---_Patient only_ - Get latest records overview.

## Consent Management**Response (200):**

### Grant Consent```json

{

**POST** `/consent/grant/` "labs": [...],

"prescriptions": [...],

_Patient only_ - Grant data access to a doctor. "encounters": [...]

}

**Headers:**```

```

Authorization: Bearer <access_token>---

```

## AI Services

**Request Body:**

### Analyze Symptoms

````json

{**POST** `/symptoms/analyze/`

  "doctor_id": 2,

  "scope": {Analyze symptom text with NLP.

    "read": ["labs", "prescriptions", "encounters"]

  },**Request:**

  "duration_hours": 48

}```json

```{

  "text": "Severe headache for 2 days, taking ibuprofen"

**Parameters:**}

- `doctor_id` (integer, required) - Doctor's user ID```

- `scope` (object, required) - Access permissions

  - `read` (array) - List of resources: "labs", "prescriptions", "encounters", "imaging", "all"**Response (200):**

- `duration_hours` (integer, optional) - Default 48 hours

```json

**Response (201 Created):**{

  "cleaned_text": "severe headache for 2 days taking ibuprofen",

```json  "entities": [

{    {

  "consent_id": 1,      "text": "headache",

  "otp": "123456",      "label": "SYMPTOM",

  "otp_last4": "3456",      "start": 7,

  "expires_at": "2025-11-02T12:00:00Z",      "end": 15

  "message": "Consent created. Share OTP with doctor."    }

}  ]

```}

````

**Errors:**

- `400` - Invalid doctor_id or scope### Predict Specialist

- `401` - Not authenticated

- `403` - Not a patient**POST** `/ai/specialist/`

---Predict which specialist to consult.

### Claim Consent**Request:**

**POST** `/consent/claim/````json

{

_Doctor only_ - Claim consent using OTP and receive scoped token. "text": "Crushing chest pain, sweating, breathless"

}

**Headers:**```

```

Authorization: Bearer <access_token>**Response (200):**

```

````json

**Request Body:**{

  "specialist": "Cardiology",

```json  "confidence": 0.91

{}

  "otp": "123456"```

}

```### Generate Patient Summary



**Response (200 OK):****POST** `/ai/summary/`



```jsonGenerate extractive summary of patient records.

{

  "scoped_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",**Request:**

  "consent": {

    "id": 1,```json

    "patient_id": 1,{

    "doctor_id": 2,  "patient_id": 1

    "scope": {}

      "read": ["labs", "prescriptions"]```

    },

    "expires_at": "2025-11-02T12:00:00Z",**Response (200):**

    "status": "active"

  }```json

}{

```  "bullets": [

    "HbA1c trending up since last visit",

**Errors:**    "Blood pressure well controlled on current medication",

- `400` - Invalid OTP    "Cholesterol levels within normal range"

- `401` - Not authenticated  ],

- `403` - Not a doctor  "citations": [

- `404` - Consent not found or expired    { "type": "lab", "id": 5 },

    { "type": "prescription", "id": 3 },

---    { "type": "encounter", "id": 12 }

  ]

### Revoke Consent}

````

**POST** `/consent/revoke/<consent_id>/`

---

_Patient only_ - Revoke a previously granted consent.

## Doctors & Scheduling

**Headers:**

````### List Doctors

Authorization: Bearer <access_token>

```**GET** `/doctors/?specialty=Cardiology&location=New%20York`



**Response (200 OK):**Search for doctors.



```json**Query Parameters:**

{

  "message": "Consent revoked successfully"- `specialty` (optional): Filter by specialty

}- `location` (optional): Filter by location

````

**Response (200):**

**Errors:**

- `401` - Not authenticated```json

- `403` - Not authorized to revoke this consent{

- `404` - Consent not found "count": 1,

  "results": [

--- {

      "id": 2,

### List Consents "email": "doctor@example.com",

      "name": "Dr. Sarah Smith",

**GET** `/consent/list/` "specialty": "Cardiology",

      "qualifications": "MD, Board Certified",

List all consents (patients see granted, doctors see received). "location": "New York, NY",

      "rating": 4.8

**Headers:** }

```]

Authorization: Bearer <access_token>}

```

**Response (200 OK):**### Get Available Slots

```json**GET** `/scheduling/doctors/<doctor_id>/slots/?date=2025-10-30`

{

"consents": [Get available appointment slots for a doctor on a specific date.

    {

      "id": 1,**Response (200):**

      "patient_id": 1,

      "patient_name": "John Doe",```json

      "doctor_id": 2,{

      "doctor_name": "Dr. Smith",  "date": "2025-10-30",

      "scope": {  "doctor_id": 2,

        "read": ["labs", "prescriptions"]  "slots": [

      },    {

      "status": "active",      "start_time": "09:00",

      "expires_at": "2025-11-02T12:00:00Z",      "end_time": "09:30",

      "created_at": "2025-10-31T12:00:00Z"      "available": true

    }    },

] {

} "start_time": "09:30",

```"end_time": "10:00",

      "available": true

---    }

  ]

### View Audit Logs}

```

**GET** `/consent/audits/`

### Book Appointment

_Admin only_ - View consent access audit trail.

**POST** `/scheduling/appointments/`

**Headers:**

````Book an appointment.

Authorization: Bearer <access_token>

```**Request:**



**Query Parameters:**```json

- `patient_id` (integer, optional) - Filter by patient{

- `doctor_id` (integer, optional) - Filter by doctor  "doctor": 2,

- `start_date` (date, optional) - From date (YYYY-MM-DD)  "patient": 1,

- `end_date` (date, optional) - To date (YYYY-MM-DD)  "date": "2025-10-30",

  "start_time": "09:00",

**Response (200 OK):**  "end_time": "09:30",

  "notes": "Follow-up consultation"

```json}

{```

  "audits": [

    {**Response (201):**

      "id": 1,

      "actor_id": 2,```json

      "actor_role": "doctor",{

      "action": "view",  "id": 1,

      "resource_type": "prescription",  "doctor": 2,

      "resource_id": 5,  "patient": 1,

      "patient_id": 1,  "date": "2025-10-30",

      "purpose": "medical review",  "start_time": "09:00:00",

      "ip_address": "192.168.1.100",  "end_time": "09:30:00",

      "timestamp": "2025-10-31T14:30:00Z"  "status": "scheduled",

    }  "notes": "Follow-up consultation",

  ]  "created_at": "2025-10-29T10:00:00Z"

}}

````

**Errors:**### Cancel Appointment

- `403` - Not an admin

**PATCH** `/scheduling/appointments/<appointment_id>/cancel/`

---

Cancel an appointment.

## Patient Profiles

**Response (200):**

### Get Patient Profile

```json

**GET** `/patients/`{

  "id": 1,

Get current user's patient profile.  "status": "canceled",

  ...

**Headers:**}

```

Authorization: Bearer <access_token>

````---



**Response (200 OK):**## Billing (Stub)



```json### List Invoices

{

  "id": 1,**GET** `/billing/invoices/`

  "user_id": 1,

  "name": "John Doe",List invoices for the authenticated user.

  "dob": "1990-05-15",

  "gender": "M",### Create Checkout

  "blood_group": "O+",

  "phone": "+1234567890",**POST** `/billing/payments/checkout/`

  "address": "123 Main St, City, State 12345",

  "medical_conditions": "Diabetes Type 2, Hypertension",Create a payment checkout session (stub).

  "profile_photo": "http://localhost:8000/media/patients/1/photo.jpg",

  "created_at": "2025-10-01T10:00:00Z",**Request:**

  "updated_at": "2025-10-31T14:00:00Z"

}```json

```{

  "invoice_id": 1

**Errors:**}

- `401` - Not authenticated```

- `404` - Patient profile not found

**Response (200):**

---

```json

### Update Patient Profile{

  "payment_url": "http://localhost:8000/api/billing/mock-payment/1",

**PUT** `/patients/`  "invoice_id": 1,

  "amount": 150.0,

Update patient profile information.  "currency": "USD"

}

**Headers:**```

````

Authorization: Bearer <access_token>---

Content-Type: application/json

````## Error Responses



**Request Body:**All endpoints may return error responses:



```json**400 Bad Request:**

{

  "name": "John Doe",```json

  "dob": "1990-05-15",{

  "gender": "M",  "error": "Invalid input data",

  "blood_group": "O+",  "details": {...}

  "phone": "+1234567890",}

  "address": "123 Main St, City, State 12345",```

  "medical_conditions": "Diabetes Type 2, Hypertension"

}**401 Unauthorized:**

````

````json

**Response (200 OK):**{

  "detail": "Authentication credentials were not provided."

```json}

{```

  "id": 1,

  "name": "John Doe",**403 Forbidden:**

  "dob": "1990-05-15",

  "gender": "M",```json

  "blood_group": "O+",{

  "phone": "+1234567890",  "error": "Access denied"

  "address": "123 Main St, City, State 12345",}

  "medical_conditions": "Diabetes Type 2, Hypertension",```

  "updated_at": "2025-10-31T14:30:00Z"

}**404 Not Found:**

````

```json

**Errors:**{

- `400` - Validation errors  "error": "Resource not found"

- `401` - Not authenticated}

```

---

**500 Internal Server Error:**

### Upload Profile Photo

```json

**POST** `/patients/upload-photo/`{

  "error": "Internal server error"

Upload or update profile photo.}

```

**Headers:**

```---

Authorization: Bearer <access_token>

Content-Type: multipart/form-data## Rate Limiting

```

No rate limiting is enforced in the local development environment.

**Request Body:**

- `photo` (file, required) - Image file (JPEG, PNG, max 5MB)## Pagination

**Response (200 OK):**List endpoints support pagination:

````json- Default page size: 20 items

{- Use `?page=2` to access subsequent pages

  "message": "Profile photo updated successfully",

  "photo_url": "http://localhost:8000/media/patients/1/photo.jpg"---

}

```## Testing with cURL



**Errors:**### Example: Login

- `400` - Invalid file type or size

- `401` - Not authenticated```bash

curl -X POST http://localhost:8000/api/auth/login/ \

---  -H "Content-Type: application/json" \

  -d '{

## Doctors    "email": "patient@example.com",

    "password": "Pass1234!"

### List Doctors  }'

````

**GET** `/doctors/`

### Example: Authenticated Request

Search and filter doctors.

````bash

**Query Parameters:**curl -X GET http://localhost:8000/api/auth/me/ \

- `specialty` (string, optional) - Filter by specialty  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

- `location` (string, optional) - Filter by location```

- `search` (string, optional) - Search by name

### Example: Upload File

**Response (200 OK):**

```bash

```jsoncurl -X POST http://localhost:8000/api/records/files/upload/ \

{  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \

  "count": 5,  -F "file=@/path/to/file.pdf" \

  "results": [  -F "kind=lab"

    {```

      "id": 2,
      "user_id": 2,
      "name": "Dr. Sarah Smith",
      "specialty": "Cardiology",
      "qualification": "MD, FACC",
      "location": "New York, NY",
      "rating": 4.8,
      "bio": "Board-certified cardiologist with 15 years experience",
      "email": "dr.smith@example.com",
      "phone": "+1234567891"
    }
  ]
}
````

---

### Get Doctor Details

**GET** `/doctors/<id>/`

Get specific doctor's information.

**Response (200 OK):**

```json
{
  "id": 2,
  "name": "Dr. Sarah Smith",
  "specialty": "Cardiology",
  "qualification": "MD, FACC",
  "location": "New York, NY",
  "rating": 4.8,
  "bio": "Board-certified cardiologist with 15 years experience",
  "email": "dr.smith@example.com",
  "phone": "+1234567891",
  "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  "consultation_fee": 150.0
}
```

**Errors:**

- `404` - Doctor not found

---

## Medical Records

### Upload Medical File

**POST** `/records/files/upload/`

_Patient only_ - Upload a medical document.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**

- `file` (file, required) - Medical document (PDF, JPEG, PNG, max 10MB)
- `kind` (string, required) - File type: "lab", "prescription", "imaging", "encounter", "other"
- `notes` (string, optional) - Additional notes

**Response (201 Created):**

```json
{
  "id": 1,
  "patient_id": 1,
  "kind": "lab",
  "filename": "blood_test_oct2025.pdf",
  "mime": "application/pdf",
  "size": 245678,
  "notes": "Annual checkup blood work",
  "created_at": "2025-10-31T10:00:00Z"
}
```

**Errors:**

- `400` - Invalid file type, size, or missing kind
- `401` - Not authenticated
- `403` - Not a patient

---

### List Medical Files

**GET** `/records/files/`

List patient's medical files.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `kind` (string, optional) - Filter by type
- `search` (string, optional) - Search filename or notes
- `page` (integer, optional) - Page number
- `page_size` (integer, optional) - Results per page (default 20)

**Response (200 OK):**

```json
{
  "count": 15,
  "next": "http://localhost:8000/api/records/files/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "kind": "lab",
      "filename": "blood_test_oct2025.pdf",
      "mime": "application/pdf",
      "size": 245678,
      "notes": "Annual checkup blood work",
      "created_at": "2025-10-31T10:00:00Z"
    }
  ]
}
```

---

### Get Signed File Link

**GET** `/records/files/<id>/link/`

Get a short-lived signed URL to download a file.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "url": "http://localhost:8000/media/patients/1/files/blood_test.pdf?sig=abc123&exp=1730376000",
  "expires_in": 300,
  "filename": "blood_test_oct2025.pdf"
}
```

**Errors:**

- `404` - File not found
- `403` - Not authorized to access this file

---

### Get Records Summary

**GET** `/records/summary/`

_Patient only_ - Get overview of latest records.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "stats": {
    "total_files": 15,
    "labs": 5,
    "prescriptions": 4,
    "imaging": 3,
    "encounters": 2,
    "other": 1
  },
  "recent_labs": [
    {
      "id": 1,
      "filename": "blood_test_oct2025.pdf",
      "created_at": "2025-10-31T10:00:00Z"
    }
  ],
  "recent_prescriptions": [
    {
      "id": 2,
      "filename": "metformin_prescription.pdf",
      "created_at": "2025-10-28T14:00:00Z"
    }
  ]
}
```

---

### List Lab Results

**GET** `/records/labs/`

List structured lab results.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "id": 1,
      "patient_id": 1,
      "test_date": "2025-10-30",
      "test_type": "Complete Blood Count",
      "results": {
        "hemoglobin": "14.5 g/dL",
        "wbc": "7500/μL",
        "platelets": "250000/μL"
      },
      "notes": "All values within normal range",
      "file_id": 1,
      "created_at": "2025-10-31T10:00:00Z"
    }
  ]
}
```

---

### List Prescriptions

**GET** `/records/prescriptions/`

List prescriptions.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "id": 1,
      "patient_id": 1,
      "doctor_id": 2,
      "doctor_name": "Dr. Sarah Smith",
      "medication": "Metformin",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "30 days",
      "issued_date": "2025-10-28",
      "file_id": 2,
      "created_at": "2025-10-28T14:00:00Z"
    }
  ]
}
```

---

### List Encounters

**GET** `/records/encounters/`

List clinical encounters/visits.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "results": [
    {
      "id": 1,
      "patient_id": 1,
      "doctor_id": 2,
      "doctor_name": "Dr. Sarah Smith",
      "encounter_date": "2025-10-28",
      "chief_complaint": "Annual checkup",
      "diagnosis": "Controlled Type 2 Diabetes",
      "treatment_plan": "Continue current medications, diet modifications",
      "notes": "Patient compliance good, HbA1c improving",
      "file_id": 3,
      "created_at": "2025-10-28T15:00:00Z"
    }
  ]
}
```

---

## Scheduling & Appointments

### Get Available Slots

**GET** `/scheduling/doctors/<doctor_id>/slots/`

Get doctor's available appointment slots for a specific date.

**Query Parameters:**

- `date` (string, required) - Date in YYYY-MM-DD format

**Response (200 OK):**

```json
{
  "date": "2025-11-01",
  "doctor_id": 2,
  "doctor_name": "Dr. Sarah Smith",
  "available_slots": [
    {
      "time": "09:00",
      "available": true
    },
    {
      "time": "09:30",
      "available": true
    },
    {
      "time": "10:00",
      "available": false,
      "reason": "Booked"
    },
    {
      "time": "10:30",
      "available": true
    }
  ]
}
```

**Errors:**

- `400` - Invalid date format
- `404` - Doctor not found

---

### Book Appointment

**POST** `/scheduling/appointments/`

_Patient only_ - Book an appointment with a doctor.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "doctor_id": 2,
  "slot_date": "2025-11-01",
  "slot_time": "09:00",
  "reason": "Annual checkup and blood pressure review"
}
```

**Response (201 Created):**

```json
{
  "id": 1,
  "patient_id": 1,
  "patient_name": "John Doe",
  "doctor_id": 2,
  "doctor_name": "Dr. Sarah Smith",
  "doctor_specialty": "Cardiology",
  "slot_date": "2025-11-01",
  "slot_time": "09:00:00",
  "reason": "Annual checkup and blood pressure review",
  "status": "scheduled",
  "created_at": "2025-10-31T15:00:00Z"
}
```

**Errors:**

- `400` - Invalid date/time, slot not available, or validation errors
- `401` - Not authenticated
- `403` - Not a patient
- `409` - Slot already booked (conflict)

---

### List Appointments

**GET** `/scheduling/appointments/`

List user's appointments (patients see their appointments, doctors see appointments with them).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `status` (string, optional) - Filter by status: "scheduled", "completed", "cancelled", "no-show"
- `date_from` (string, optional) - From date (YYYY-MM-DD)
- `date_to` (string, optional) - To date (YYYY-MM-DD)

**Response (200 OK):**

```json
{
  "count": 3,
  "upcoming": [
    {
      "id": 1,
      "patient_id": 1,
      "patient_name": "John Doe",
      "doctor_id": 2,
      "doctor_name": "Dr. Sarah Smith",
      "doctor_specialty": "Cardiology",
      "slot_date": "2025-11-01",
      "slot_time": "09:00:00",
      "reason": "Annual checkup",
      "status": "scheduled",
      "created_at": "2025-10-31T15:00:00Z"
    }
  ],
  "past": [
    {
      "id": 2,
      "patient_id": 1,
      "patient_name": "John Doe",
      "doctor_id": 2,
      "doctor_name": "Dr. Sarah Smith",
      "slot_date": "2025-10-15",
      "slot_time": "14:00:00",
      "reason": "Follow-up",
      "status": "completed",
      "created_at": "2025-10-10T10:00:00Z"
    }
  ]
}
```

---

### Get Appointment Details

**GET** `/scheduling/appointments/<id>/`

Get specific appointment details.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "id": 1,
  "patient_id": 1,
  "patient_name": "John Doe",
  "patient_phone": "+1234567890",
  "doctor_id": 2,
  "doctor_name": "Dr. Sarah Smith",
  "doctor_specialty": "Cardiology",
  "doctor_location": "New York, NY",
  "slot_date": "2025-11-01",
  "slot_time": "09:00:00",
  "reason": "Annual checkup and blood pressure review",
  "status": "scheduled",
  "created_at": "2025-10-31T15:00:00Z",
  "updated_at": "2025-10-31T15:00:00Z"
}
```

**Errors:**

- `404` - Appointment not found
- `403` - Not authorized to view this appointment

---

### Update Appointment Status

**PATCH** `/scheduling/appointments/<id>/`

Update appointment status.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "status": "cancelled"
}
```

**Allowed status transitions:**

- Patient can: `scheduled` → `cancelled`
- Doctor can: `scheduled` → `completed`, `cancelled`, `no-show`

**Response (200 OK):**

```json
{
  "id": 1,
  "status": "cancelled",
  "updated_at": "2025-10-31T16:00:00Z"
}
```

**Errors:**

- `400` - Invalid status or transition
- `403` - Not authorized to update this appointment
- `404` - Appointment not found

---

### Cancel Appointment

**DELETE** `/scheduling/appointments/<id>/`

Cancel an appointment (convenience endpoint, same as PATCH with status=cancelled).

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (204 No Content)**

**Errors:**

- `403` - Not authorized to cancel this appointment
- `404` - Appointment not found

---

## AI Services

### Enhanced AI Analysis (NEW)

**POST** `/ai/analyze-enhanced/`

Comprehensive two-mode AI analysis system with medical history integration and safety disclaimers.

**⚠️ MEDICAL DISCLAIMER**: This AI analysis is for informational purposes ONLY and should NOT replace professional medical advice.

**Modes:**

1. **Quick Answer** - Fast sklearn-based analysis (1-2 seconds)
2. **Deep Analysis** - Comprehensive PyTorch + medical history review (5-15 seconds)

**Request:**

```json
{
  "symptoms": "I have fever, headache, and body aches for 3 days",
  "mode": "deep",
  "include_history": true
}
```

**Parameters:**

- `symptoms` (string, required) - Description of symptoms
- `mode` (string, required) - Either "quick" or "deep"
- `include_history` (boolean, optional) - For deep mode, include medical records

**Response (200) - Quick Mode:**

```json
{
  "mode": "quick",
  "analysis": {
    "primary_recommendation": "Internal Medicine",
    "confidence": 0.87,
    "processing_time": "1.2s",
    "model_reasoning": "Sklearn classifier analyzed symptom patterns",
    "extracted_entities": {
      "symptoms": ["fever", "headache", "body aches"],
      "duration": ["3 days"],
      "severity": []
    }
  },
  "recommendations": [
    "Consult an Internal Medicine specialist within 24-48 hours",
    "Monitor temperature regularly",
    "Stay hydrated and rest"
  ],
  "next_steps": {
    "urgency": "URGENT - Seek care within 24-48 hours",
    "preparation": [
      "Track your temperature readings",
      "Note any changes in symptoms",
      "List current medications"
    ],
    "monitoring": [
      "Watch for worsening symptoms",
      "Monitor fever trends",
      "Check for new symptoms"
    ]
  },
  "warnings": ["Fever lasting more than 3 days requires medical attention"],
  "disclaimer": "This AI analysis is for informational purposes ONLY. It is NOT a substitute for professional medical advice..."
}
```

**Response (200) - Deep Mode:**

```json
{
  "mode": "deep",
  "analysis": {
    "recommended_specialist": "Internal Medicine",
    "confidence": 0.92,
    "processing_time": "8.3s",
    "reasoning": "Based on symptom analysis, 12 historical encounters, 3 lab results, and medical knowledge base. Patient has history of recurring infections which increases urgency.",
    "historical_context": {
      "total_records": 18,
      "lab_results_reviewed": 3,
      "prescriptions_reviewed": 5,
      "previous_symptoms": 2,
      "uploaded_files": 8
    },
    "medical_knowledge": {
      "conditions_considered": [
        "Viral Infection (probability: 0.72)",
        "Bacterial Infection (probability: 0.18)",
        "Influenza (probability: 0.65)"
      ],
      "knowledge_base_hits": 127
    },
    "extracted_entities": {
      "symptoms": ["fever", "headache", "body aches"],
      "duration": ["3 days"],
      "severity": []
    }
  },
  "recommendations": [
    "Schedule appointment with Internal Medicine specialist within 24 hours",
    "Complete blood count (CBC) test recommended",
    "Consider influenza screening",
    "Drink plenty of fluids and rest"
  ],
  "next_steps": {
    "urgency": "URGENT - Medical attention within 24 hours recommended",
    "preparation": [
      "Bring previous lab results from last 3 months",
      "List all current medications and supplements",
      "Track symptom progression hourly"
    ],
    "monitoring": [
      "Seek EMERGENCY care if fever exceeds 103°F (39.4°C)",
      "Watch for difficulty breathing or chest pain",
      "Monitor for confusion or severe weakness"
    ]
  },
  "warnings": [
    "Patient has history of recurring infections - early treatment important",
    "Prolonged fever with body aches may indicate serious infection"
  ],
  "disclaimer": "This AI analysis is for informational purposes ONLY..."
}
```

**Errors:**

- `400` - Invalid mode or missing symptoms
- `401` - Not authenticated
- `500` - AI model error

**Notes:**

- **Quick Mode**: Uses sklearn classifier for rapid pattern matching
- **Deep Mode**: Uses PyTorch deep learning + reviews all patient medical records
- Medical disclaimer is ALWAYS included in every response
- Urgency levels: EMERGENCY, URGENT, ROUTINE
- Deep mode may take 5-15 seconds depending on medical history size

---

### Analyze Symptoms

**POST** `/symptoms/analyze/`

Analyze symptom text with NLP to extract medical entities.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "text": "Severe headache for 2 days, taking ibuprofen 400mg"
}
```

**Response (200 OK):**

```json
{
  "cleaned_text": "severe headache for 2 days taking ibuprofen 400mg",
  "entities": [
    {
      "text": "headache",
      "label": "SYMPTOM",
      "start": 7,
      "end": 15
    },
    {
      "text": "ibuprofen",
      "label": "MEDICATION",
      "start": 35,
      "end": 44
    },
    {
      "text": "400mg",
      "label": "DOSE",
      "start": 45,
      "end": 50
    }
  ]
}
```

---

### Predict Specialist

**POST** `/ai/specialist/`

Predict which medical specialist to consult based on symptoms.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "text": "Crushing chest pain, sweating, difficulty breathing"
}
```

**Response (200 OK):**

```json
{
  "specialist": "Cardiologist",
  "confidence": 0.92,
  "alternatives": [
    {
      "specialist": "Pulmonologist",
      "confidence": 0.05
    },
    {
      "specialist": "General Physician",
      "confidence": 0.02
    }
  ],
  "model_type": "pytorch"
}
```

**Model types:**

- `pytorch` - PyTorch DistilBERT (85-95% accuracy)
- `sklearn` - Scikit-learn TF-IDF (75-85% accuracy)
- `legacy` - Rule-based fallback
- `fallback` - No model available

---

### Generate Medical Summary

**POST** `/ai/summary/`

Generate AI summary of patient's medical records.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "patient_id": 1,
  "query": "Recent lab results and current medications",
  "max_points": 5
}
```

**Response (200 OK):**

```json
{
  "summary": [
    "Patient diagnosed with Type 2 Diabetes on 2024-10-15",
    "Current medications: Metformin 500mg twice daily",
    "Recent HbA1c: 7.2% (down from 8.5% in June)",
    "Blood pressure stable at 120/80 mmHg",
    "Recommended dietary changes and regular exercise"
  ],
  "sources": [
    {
      "file_id": 12,
      "filename": "lab_results_oct2025.pdf",
      "relevance": 0.95
    },
    {
      "file_id": 15,
      "filename": "prescription_metformin.pdf",
      "relevance": 0.87
    }
  ],
  "confidence": 0.89
}
```

**Errors:**

- `400` - Missing patient_id or query
- `404` - Patient or records not found
- `503` - FAISS index not built (need to run build_index command)

---

### Build Patient Index

**POST** `/ai/build-index/`

_Admin only_ - Build or rebuild FAISS vector index for patient records.

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "patient_id": 1
}
```

**Response (200 OK):**

```json
{
  "message": "Index built successfully",
  "patient_id": 1,
  "documents_indexed": 15,
  "time_taken": 2.34
}
```

---

### Check Model Status

**GET** `/ai/models/status/`

Check which AI models are trained and available.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "models": {
    "pytorch": {
      "available": true,
      "accuracy": "85-95%",
      "type": "Deep Learning",
      "description": "DistilBERT transformer model",
      "size": "250 MB",
      "inference_time": "20-50ms"
    },
    "sklearn": {
      "available": true,
      "accuracy": "75-85%",
      "type": "Classical ML",
      "description": "TF-IDF + Logistic Regression",
      "size": "1-2 MB",
      "inference_time": "1-5ms"
    }
  },
  "current_model": "pytorch",
  "recommendations": [
    "PyTorch model is trained and active",
    "Using highest accuracy model for predictions"
  ]
}
```

---

## Billing

### List Invoices

**GET** `/billing/invoices/`

List user's invoices.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
  "invoices": [
    {
      "id": 1,
      "patient_id": 1,
      "amount": 150.0,
      "description": "Consultation - Dr. Sarah Smith",
      "status": "paid",
      "due_date": "2025-11-15",
      "created_at": "2025-10-31T10:00:00Z"
    }
  ]
}
```

---

### Create Payment Checkout

**POST** `/billing/payments/checkout/`

Create a payment checkout session (stub for future payment integration).

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "invoice_id": 1,
  "payment_method": "card"
}
```

**Response (200 OK):**

```json
{
  "checkout_url": "https://payment-gateway.com/checkout/abc123",
  "session_id": "sess_abc123",
  "expires_at": "2025-10-31T16:00:00Z"
}
```

---

### Payment Webhook

**POST** `/billing/payments/webhook/`

Webhook endpoint for payment confirmation (internal use).

---

## Error Responses

### Standard Error Format

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": {
    "field": ["Specific field error"]
  }
}
```

### Common HTTP Status Codes

- **200 OK** - Request succeeded
- **201 Created** - Resource created successfully
- **204 No Content** - Request succeeded, no response body
- **400 Bad Request** - Invalid request data
- **401 Unauthorized** - Not authenticated or invalid token
- **403 Forbidden** - Authenticated but not authorized
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Resource conflict (e.g., duplicate booking)
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - Service temporarily unavailable

### Example Error Responses

**400 Bad Request:**

```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": {
    "email": ["Enter a valid email address"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

**401 Unauthorized:**

```json
{
  "error": "Authentication Failed",
  "message": "Invalid or expired token"
}
```

**403 Forbidden:**

```json
{
  "error": "Permission Denied",
  "message": "You don't have permission to access this resource"
}
```

**404 Not Found:**

```json
{
  "error": "Not Found",
  "message": "Appointment with id 999 not found"
}
```

**409 Conflict:**

```json
{
  "error": "Conflict",
  "message": "This appointment slot is already booked"
}
```

---

## Rate Limiting

API has rate limiting to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **OTP requests**: 5 per hour per user

Rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1730379600
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**

- `page` - Page number (default: 1)
- `page_size` - Results per page (default: 20, max: 100)

**Response Format:**

```json
{
  "count": 150,
  "next": "http://localhost:8000/api/records/files/?page=3",
  "previous": "http://localhost:8000/api/records/files/?page=1",
  "results": [...]
}
```

---

## Testing with cURL

### Login Example

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "Pass1234!"
  }'

# Save token
export TOKEN="your_access_token_here"

# Use token
curl http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer $TOKEN"
```

### File Upload Example

```bash
curl -X POST http://localhost:8000/api/records/files/upload/ \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "kind=lab" \
  -F "notes=Annual blood work"
```

---

## Demo Accounts

The backend comes with pre-seeded demo accounts:

**Patient:**

- Email: `patient@example.com`
- Password: `Pass1234!`

**Doctor:**

- Email: `doctor@example.com`
- Password: `Pass1234!`

**Admin:**

- Email: `admin@nexuscare.com`
- Password: `Admin1234!`

---

## API Versioning

Current API version: **v1**

Future versions will be accessible at `/api/v2/`, `/api/v3/`, etc.

---

## Support

For API issues or questions:

1. Check error response message
2. Review this documentation
3. Check backend logs: `python manage.py runserver`
4. See [backend.md](backend.md) for setup and troubleshooting

---

**Last Updated:** October 31, 2025  
**API Version:** 1.0  
**Django Version:** 5.0.1  
**DRF Version:** 3.14.0
