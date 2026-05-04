/**
 * Core API types matching Django backend models
 */

// ========================================
// USER & AUTHENTICATION
// ========================================

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface User {
  id: number;
  email: string;
  phone: string | null;
  role: UserRole;
  twofa_enabled: boolean;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
  patient_profile?: Patient;
  doctor_profile?: Doctor;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
  requires_2fa?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface TwoFARequest {
  email: string;
  purpose: '2fa' | 'consent';
}

export interface TwoFAVerifyRequest {
  email: string;
  code: string;
  purpose: '2fa' | 'consent';
}

// ========================================
// PATIENT
// ========================================

export type Gender = 'M' | 'F' | 'O' | 'N';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface Patient {
  id: number;
  patient_code?: string;
  user: number;
  email: string;
  name: string;
  profile_photo: string | null;
  phone: string;
  dob: string | null;
  gender: Gender;
  blood_group: BloodGroup;
  address: string;
  emergency_contact: string;
  created_at: string;
  updated_at: string;
}

export interface PatientCreateRequest {
  name: string;
  phone?: string;
  dob?: string;
  gender?: Gender;
  blood_group?: BloodGroup;
  address?: string;
  emergency_contact?: string;
}

// ========================================
// DOCTOR
// ========================================

export interface Doctor {
  id: number;
  user: number;
  name: string;
  specialty: string;
  qualifications: string;
  bio: string;
  location: string;
  rating: number;
  calendar_connected: boolean;
}

export interface DoctorCreateRequest {
  name: string;
  specialty: string;
  qualifications?: string;
  bio?: string;
  location?: string;
}

// ========================================
// APPOINTMENTS
// ========================================

export type AppointmentStatus = 'scheduled' | 'canceled' | 'done' | 'hold' | 'expired';

export interface Appointment {
  id: number;
  doctor: number;
  patient: number;
  doctor_name?: string;
  specialty?: string;
  doctor_details?: Doctor;
  patient_details?: Patient;
  patient_name?: string;
  patient_phone?: string;
  patient_code?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  consent_granted: boolean; // Whether patient granted record access
  consent: number | null; // ID of linked consent
  created_at: string;
}

export interface AppointmentCreateRequest {
  doctor: number;
  patient: number;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  grant_consent?: boolean; // Auto-create consent for this appointment
}

export interface DoctorAvailability {
  id: number;
  doctor: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  session_duration_minutes: number;
  max_patients: number;
  minutes_per_patient: number;
  breaks: Array<{ start: string; end: string }>;
  // read-only computed fields from backend
  end_time: string; // HH:MM
  booked_count: number;
}

// ========================================
// MEDICAL RECORDS
// ========================================

export type FileKind = 'lab' | 'prescription' | 'encounter' | 'other';

export interface MedicalFile {
  id: number;
  patient: number;
  kind: FileKind;
  filename: string;
  storage_path: string;
  mime: string;
  size: number;
  created_at: string;
}

export interface LabResult {
  id: number;
  patient: number;
  title: string;
  summary: string;
  data: Record<string, any>;
  file: number | null;
  ts: string;
}

export interface PrescriptionItem {
  drug: string;
  dosage: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: number;
  patient: number;
  doctor: number | null;
  doctor_details?: Doctor;
  items: PrescriptionItem[];
  notes: string;
  ts: string;
}

export interface Encounter {
  id: number;
  patient: number;
  doctor: number | null;
  doctor_details?: Doctor;
  notes: string;
  diagnosis: string;
  plan: string;
  ts: string;
}

// ========================================
// AI FEATURES
// ========================================

export interface AISummary {
  id: number;
  patient: number;
  source_ids: number[];
  text: string;
  method: 'textrank' | 'other';
  citations: number[];
  ts: string;
}

export interface AIAnalysisRequest {
  patient_id: number;
  text: string;
  mode?: 'summary' | 'specialist' | 'search';
}

export interface AIAnalysisResponse {
  summary?: string;
  specialist_recommendation?: {
    specialist: string;
    confidence: number;
    reasoning: string;
  };
  search_results?: Array<{
    id: number;
    type: string;
    content: string;
    relevance: number;
  }>;
}

// ========================================
// BILLING
// ========================================

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface Invoice {
  id: number;
  patient: number;
  amount: number;
  description: string;
  status: PaymentStatus;
  due_date: string;
  paid_at: string | null;
  created_at: string;
}

// ========================================
// CONSENT
// ========================================

export type ConsentStatus = 'active' | 'revoked' | 'expired';

export interface ConsentScope {
  read?: string[]; // e.g., ["labs", "prescriptions", "encounters", "files"]
  write?: string[];
}

export interface Consent {
  id: number;
  patient: number;
  doctor: number;
  scope: ConsentScope;
  expires_at: string;
  status: ConsentStatus;
  created_at: string;
}

export interface ConsentGrantRequest {
  doctor_id: number;
  scope: ConsentScope;
  duration_hours: number; // How long consent is valid
}

export interface ConsentRequest {
  id: number;
  from_patient: number;
  to_patient: number;
  status: 'pending' | 'granted' | 'denied';
  message: string;
  created_at: string;
  responded_at: string | null;
}

// ========================================
// PAGINATION
// ========================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ========================================
// NOTIFICATIONS
// ========================================

export interface Notification {
  id: number;
  user: number;
  title: string;
  message: string;
  type: 'appointment' | 'lab_result' | 'prescription' | 'system' | 'consent';
  read: boolean;
  created_at: string;
}
