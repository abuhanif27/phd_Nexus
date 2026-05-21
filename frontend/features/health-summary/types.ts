import type { MedicalFile } from '@/features/records/types';

export interface HealthMetric {
  label: string;
  value: string;
  unit?: string;
  status: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

export interface VitalSign {
  type: 'blood_pressure' | 'heart_rate' | 'temperature' | 'weight' | 'height' | 'bmi';
  value: string;
  unit: string;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
}

export interface HealthCondition {
  id: number;
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical' | 'normal';
  diagnosed_date: string;
  status: 'active' | 'managed' | 'resolved' | 'chronic';
}

export interface Allergy {
  id: number;
  allergen: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'discontinued' | 'on_hold';
}

export interface HealthSummary {
  vital_signs: VitalSign[];
  conditions: HealthCondition[];
  allergies: Allergy[];
  medications: Medication[];
  last_checkup?: string;
  next_appointment?: string;
  health_score?: number;
  ai_insights?: string[];
  /** AI-generated summary from medical records (TextRank + NER). */
  summary?: string;
  /** Bullet points from extractive summary. */
  bullets?: string[];
  /** Record counts used for summary: lab, prescription, encounter, file. */
  source_counts?: { lab?: number; prescription?: number; encounter?: number; file?: number };
  record_count?: number;
  date_range?: { oldest?: string; newest?: string };
  /** Content from uploaded records (summary + bullets) for the analyze section. */
  record_highlights?: string[];
  /** Clean, professional narrative (no raw OCR dump). */
  professional_summary?: string;
  /** Short key findings (conditions, vaccination, etc.) for display. */
  professional_findings?: string[];
  extracted_vitals?: {
    blood_pressure: string;
    heart_rate: string;
    temperature: string;
    weight: string;
  };
  /** Detailed source files used for this summary. */
  source_files?: MedicalFile[];
  /** Indicates lab-only summary fallback to non-lab files. */
  lab_only_fallback?: boolean;
  /** Message for lab-only fallback. */
  lab_only_message?: string;
}
