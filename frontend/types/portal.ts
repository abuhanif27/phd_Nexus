export type PortalRole = 'patient' | 'doctor' | 'hospital';

export type RecordKind = 'prescription' | 'lab' | 'visit' | 'scan';

export type PrescriptionCategory = 'condition' | 'advice' | 'test' | 'medicine';

export interface EntryProfile {
  id: string;
  role: PortalRole;
  name: string;
  phone?: string;
  email?: string;
  specialty?: string;
  hospitalName?: string;
  createdAt: string;
}

export interface MedicationPlan {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  times: string[];
}

export interface MedicationReminder {
  id: string;
  medicationId: string;
  label: string;
  time: string;
  enabled: boolean;
  lastTriggeredAt?: string;
}

export interface PatientRecord {
  id: string;
  title: string;
  kind: RecordKind;
  date: string;
  doctorName: string;
  department: string;
  summary: string;
  details: string[];
  tags: string[];
  medicines?: MedicationPlan[];
}

export interface AssistantSuggestion {
  specialist: string;
  reason: string;
  urgency: 'routine' | 'soon' | 'priority';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  createdAt: string;
  suggestion?: AssistantSuggestion;
}

export interface VisitCode {
  code: string;
  patientProfileId: string;
  createdAt: string;
  expiresAt: string;
}

export interface PatientWorkspace {
  records: PatientRecord[];
  activeMedicationPlan: MedicationPlan[];
  reminders: MedicationReminder[];
  chatMessages: ChatMessage[];
  latestVisitCode?: VisitCode;
}

export interface PrescriptionTemplate {
  id: string;
  label: string;
  detail: string;
  category: PrescriptionCategory;
}

export type PrescriptionDraft = Record<PrescriptionCategory, PrescriptionTemplate[]>;

export interface DoctorWorkspace {
  templates: Record<PrescriptionCategory, PrescriptionTemplate[]>;
  draft: PrescriptionDraft;
  linkedPatientProfileId?: string;
  resolvedVisitCode?: string;
}

export interface HospitalDepartmentRow {
  id: string;
  department: string;
  patients: number;
  revenue: number;
  expenses: number;
  beds: number;
  occupiedBeds: number;
  doctors: number;
  avgWaitMinutes: number;
  testsRun: number;
}

export interface HospitalWorkspace {
  rows: HospitalDepartmentRow[];
}

export interface HospitalMetrics {
  totalPatients: number;
  totalRevenue: number;
  totalExpenses: number;
  netRevenue: number;
  occupancyRate: number;
  averageWaitMinutes: number;
  revenuePerDoctor: number;
  testsPerPatient: number;
}
