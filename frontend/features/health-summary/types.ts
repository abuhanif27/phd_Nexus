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
  severity: 'mild' | 'moderate' | 'severe';
  diagnosed_date: string;
  status: 'active' | 'managed' | 'resolved';
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
  status: 'active' | 'completed' | 'discontinued';
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
}
