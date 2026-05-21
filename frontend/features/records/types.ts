export interface MedicalFile {
  id: number;
  patient: number;
  kind: 'lab' | 'prescription' | 'encounter' | 'other';
  filename: string;
  storage_path: string;
  mime: string;
  size: number;
  created_at: string;
  clinical_date?: string;
}

export interface LabResult {
  id: number;
  patient: number;
  title: string;
  summary: string;
  data: Record<string, any>;
  file?: number;
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
  doctor: number;
  doctor_name?: string;
  items: PrescriptionItem[];
  notes: string;
  expires_at?: string;
  ts: string;
}

export interface Encounter {
  id: number;
  patient: number;
  doctor: number;
  doctor_name?: string;
  notes: string;
  diagnosis: string;
  plan: string;
  ts: string;
}

export interface SymptomLog {
  id: number;
  patient: number;
  text: string;
  cleaned_text: string;
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
  }>;
  ts: string;
}

export type RecordType = 'all' | 'lab' | 'prescription' | 'encounter' | 'file';
