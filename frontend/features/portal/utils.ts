import type {
  AssistantSuggestion,
  DoctorWorkspace,
  EntryProfile,
  HospitalDepartmentRow,
  HospitalMetrics,
  HospitalWorkspace,
  MedicationPlan,
  MedicationReminder,
  PatientRecord,
  PatientWorkspace,
  PortalRole,
  PrescriptionCategory,
  PrescriptionDraft,
  PrescriptionTemplate,
  VisitCode,
} from '@/types/portal';

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function generateVisitCode(now = new Date()): string {
  const datePart = `${now.getMonth() + 1}${now.getDate()}`.padStart(4, '0');
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NC-${datePart}-${randomPart}`;
}

export function suggestSpecialistFromText(text: string): AssistantSuggestion {
  const normalized = text.toLowerCase();

  const rules: Array<{
    keywords: string[];
    specialist: string;
    reason: string;
    urgency: AssistantSuggestion['urgency'];
  }> = [
    {
      keywords: ['chest', 'heart', 'pressure', 'palpitation'],
      specialist: 'Cardiologist',
      reason: 'Cardiac symptoms were detected in the conversation.',
      urgency: 'priority',
    },
    {
      keywords: ['skin', 'rash', 'itch', 'allergy'],
      specialist: 'Dermatologist',
      reason: 'Skin-related symptoms usually need dermatology review.',
      urgency: 'routine',
    },
    {
      keywords: ['headache', 'migraine', 'dizziness', 'numb'],
      specialist: 'Neurologist',
      reason: 'Neurological symptoms were identified from the chat.',
      urgency: 'soon',
    },
    {
      keywords: ['stomach', 'acid', 'liver', 'abdomen', 'digestion'],
      specialist: 'Gastroenterologist',
      reason: 'Digestive complaints fit a gastroenterology review.',
      urgency: 'soon',
    },
    {
      keywords: ['cough', 'breathing', 'asthma', 'lungs', 'shortness'],
      specialist: 'Pulmonologist',
      reason: 'Respiratory symptoms suggest a lung specialist review.',
      urgency: 'priority',
    },
    {
      keywords: ['child', 'baby', 'kid', 'infant'],
      specialist: 'Pediatrician',
      reason: 'The issue appears related to a child patient.',
      urgency: 'routine',
    },
  ];

  const match = rules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));

  if (match) {
    return {
      specialist: match.specialist,
      reason: match.reason,
      urgency: match.urgency,
    };
  }

  return {
    specialist: 'General Medicine Specialist',
    reason: 'A general physician can triage the symptoms and refer onward if needed.',
    urgency: 'routine',
  };
}

export function calculateHospitalMetrics(rows: HospitalDepartmentRow[]): HospitalMetrics {
  const totals = rows.reduce(
    (acc, row) => {
      acc.totalPatients += row.patients;
      acc.totalRevenue += row.revenue;
      acc.totalExpenses += row.expenses;
      acc.totalBeds += row.beds;
      acc.occupiedBeds += row.occupiedBeds;
      acc.totalDoctors += row.doctors;
      acc.weightedWait += row.avgWaitMinutes * row.patients;
      acc.totalTests += row.testsRun;
      return acc;
    },
    {
      totalPatients: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalBeds: 0,
      occupiedBeds: 0,
      totalDoctors: 0,
      weightedWait: 0,
      totalTests: 0,
    }
  );

  return {
    totalPatients: totals.totalPatients,
    totalRevenue: totals.totalRevenue,
    totalExpenses: totals.totalExpenses,
    netRevenue: totals.totalRevenue - totals.totalExpenses,
    occupancyRate:
      totals.totalBeds > 0
        ? Number(((totals.occupiedBeds / totals.totalBeds) * 100).toFixed(1))
        : 0,
    averageWaitMinutes:
      totals.totalPatients > 0
        ? Number((totals.weightedWait / totals.totalPatients).toFixed(1))
        : 0,
    revenuePerDoctor:
      totals.totalDoctors > 0 ? Number((totals.totalRevenue / totals.totalDoctors).toFixed(1)) : 0,
    testsPerPatient:
      totals.totalPatients > 0 ? Number((totals.totalTests / totals.totalPatients).toFixed(2)) : 0,
  };
}

export function buildDoctorAiSummary(profile: EntryProfile, workspace: PatientWorkspace): string[] {
  const latestRecord = workspace.records[0];
  const activeMedicineNames = workspace.activeMedicationPlan.map((item) => item.name).join(', ');
  const recentDepartments = Array.from(
    new Set(workspace.records.slice(0, 3).map((record) => record.department))
  );

  return [
    `${profile.name} has ${workspace.records.length} linked records available for quick review.`,
    latestRecord
      ? `Latest update: ${latestRecord.title} on ${latestRecord.date} by ${latestRecord.doctorName}.`
      : 'No recent record found.',
    activeMedicineNames
      ? `Current running prescription includes ${activeMedicineNames}.`
      : 'No active medication plan is currently recorded.',
    recentDepartments.length > 0
      ? `Recent departments involved: ${recentDepartments.join(', ')}.`
      : 'No department trend is currently available.',
  ];
}

function createMedicationPlans(): MedicationPlan[] {
  return [
    {
      id: createId('med'),
      name: 'Azithromycin',
      dosage: '500 mg',
      frequency: 'Once daily',
      instructions: 'After breakfast for 5 days',
      times: ['08:00'],
    },
    {
      id: createId('med'),
      name: 'Montelukast',
      dosage: '10 mg',
      frequency: 'Night dose',
      instructions: 'Take before sleep',
      times: ['22:00'],
    },
    {
      id: createId('med'),
      name: 'Vitamin D3',
      dosage: '1 tablet',
      frequency: 'Once daily',
      instructions: 'After lunch',
      times: ['13:30'],
    },
  ];
}

function createReminders(medicines: MedicationPlan[]): MedicationReminder[] {
  return medicines.flatMap((medicine) =>
    medicine.times.map((time) => ({
      id: createId('reminder'),
      medicationId: medicine.id,
      label: `${medicine.name} • ${medicine.dosage}`,
      time,
      enabled: true,
    }))
  );
}

function createPatientRecords(medicines: MedicationPlan[]): PatientRecord[] {
  return [
    {
      id: createId('record'),
      title: 'Running Prescription',
      kind: 'prescription',
      date: '2026-03-10',
      doctorName: 'Dr. Samira Ahmed',
      department: 'Respiratory Medicine',
      summary: 'Seasonal cough and allergy management with medicine reminders enabled.',
      details: [
        'Persistent dry cough improved after 3 days of treatment.',
        'No fever in the last 48 hours.',
        'Follow-up advised if shortness of breath increases.',
      ],
      tags: ['current', 'medication', 'follow-up'],
      medicines,
    },
    {
      id: createId('record'),
      title: 'CBC + CRP Lab Review',
      kind: 'lab',
      date: '2026-03-04',
      doctorName: 'Dr. Samira Ahmed',
      department: 'Diagnostics',
      summary: 'Inflammation marker mildly elevated; hydration and repeat test advised.',
      details: [
        'CRP mildly elevated at 11 mg/L.',
        'CBC otherwise stable.',
        'Repeat test suggested after medication cycle.',
      ],
      tags: ['lab', 'blood', 'monitoring'],
    },
    {
      id: createId('record'),
      title: 'ENT Follow-up Visit',
      kind: 'visit',
      date: '2026-02-20',
      doctorName: 'Dr. Rafiq Hasan',
      department: 'ENT',
      summary: 'Throat irritation reduced. Continue fluids and sleep hygiene.',
      details: [
        'Throat redness decreased since last consultation.',
        'No swallowing difficulty.',
        'Sleep routine counseling provided.',
      ],
      tags: ['visit', 'ent', 'improved'],
    },
    {
      id: createId('record'),
      title: 'Chest X-Ray Overview',
      kind: 'scan',
      date: '2026-01-15',
      doctorName: 'Dr. Nusrat Jahan',
      department: 'Radiology',
      summary: 'No focal consolidation. Mild bronchial markings noted.',
      details: [
        'No pneumonia pattern noted.',
        'Mild bronchial prominence observed.',
        'Clinical correlation recommended.',
      ],
      tags: ['scan', 'radiology', 'archive'],
    },
  ];
}

function createPatientChat(): PatientWorkspace['chatMessages'] {
  return [
    {
      id: createId('chat'),
      sender: 'assistant',
      text: 'Describe symptoms here. The assistant will suggest the most relevant specialist.',
      createdAt: new Date('2026-03-12T09:00:00').toISOString(),
      suggestion: {
        specialist: 'General Medicine Specialist',
        reason: 'Initial triage is ready for symptom-based follow-up.',
        urgency: 'routine',
      },
    },
  ];
}

function emptyDraft(): PrescriptionDraft {
  return {
    condition: [],
    advice: [],
    test: [],
    medicine: [],
  };
}

function createDoctorTemplates(): Record<PrescriptionCategory, PrescriptionTemplate[]> {
  return {
    condition: [
      {
        id: createId('tpl'),
        label: 'Upper respiratory infection',
        detail: 'Acute cough with throat irritation',
        category: 'condition',
      },
      {
        id: createId('tpl'),
        label: 'Seasonal allergy',
        detail: 'Sneezing, nasal irritation, itchy throat',
        category: 'condition',
      },
      {
        id: createId('tpl'),
        label: 'Gastric irritation',
        detail: 'Acidity and post-meal discomfort',
        category: 'condition',
      },
    ],
    advice: [
      {
        id: createId('tpl'),
        label: 'Hydration advice',
        detail: 'Increase water intake and warm fluids',
        category: 'advice',
      },
      {
        id: createId('tpl'),
        label: 'Sleep hygiene',
        detail: 'Maintain consistent sleep and avoid late-night meals',
        category: 'advice',
      },
      {
        id: createId('tpl'),
        label: 'Emergency return',
        detail: 'Return immediately if breathing difficulty or high fever starts',
        category: 'advice',
      },
    ],
    test: [
      { id: createId('tpl'), label: 'CBC', detail: 'Complete blood count', category: 'test' },
      {
        id: createId('tpl'),
        label: 'CRP',
        detail: 'Inflammation marker follow-up',
        category: 'test',
      },
      {
        id: createId('tpl'),
        label: 'Chest X-Ray',
        detail: 'PA view for respiratory screening',
        category: 'test',
      },
    ],
    medicine: [
      {
        id: createId('tpl'),
        label: 'Azithromycin 500 mg',
        detail: '1+0+0 for 5 days after breakfast',
        category: 'medicine',
      },
      {
        id: createId('tpl'),
        label: 'Montelukast 10 mg',
        detail: '0+0+1 for 10 nights',
        category: 'medicine',
      },
      {
        id: createId('tpl'),
        label: 'Cetirizine 10 mg',
        detail: '0+0+1 for allergy control',
        category: 'medicine',
      },
    ],
  };
}

export function seedPatientWorkspace(): PatientWorkspace {
  const medicines = createMedicationPlans();
  return {
    records: createPatientRecords(medicines),
    activeMedicationPlan: medicines,
    reminders: createReminders(medicines),
    chatMessages: createPatientChat(),
  };
}

export function seedDoctorWorkspace(): DoctorWorkspace {
  return {
    templates: createDoctorTemplates(),
    draft: emptyDraft(),
  };
}

export function seedHospitalWorkspace(): HospitalWorkspace {
  return {
    rows: [
      {
        id: createId('row'),
        department: 'Medicine',
        patients: 140,
        revenue: 520000,
        expenses: 315000,
        beds: 60,
        occupiedBeds: 49,
        doctors: 8,
        avgWaitMinutes: 24,
        testsRun: 180,
      },
      {
        id: createId('row'),
        department: 'Cardiology',
        patients: 82,
        revenue: 470000,
        expenses: 290000,
        beds: 40,
        occupiedBeds: 34,
        doctors: 6,
        avgWaitMinutes: 31,
        testsRun: 126,
      },
      {
        id: createId('row'),
        department: 'Diagnostics',
        patients: 210,
        revenue: 390000,
        expenses: 210000,
        beds: 15,
        occupiedBeds: 9,
        doctors: 5,
        avgWaitMinutes: 18,
        testsRun: 420,
      },
      {
        id: createId('row'),
        department: 'Emergency',
        patients: 120,
        revenue: 610000,
        expenses: 430000,
        beds: 30,
        occupiedBeds: 28,
        doctors: 10,
        avgWaitMinutes: 12,
        testsRun: 160,
      },
    ],
  };
}

export function seedWorkspaceByRole(role: PortalRole): {
  patientWorkspace?: PatientWorkspace;
  doctorWorkspace?: DoctorWorkspace;
  hospitalWorkspace?: HospitalWorkspace;
} {
  switch (role) {
    case 'patient':
      return { patientWorkspace: seedPatientWorkspace() };
    case 'doctor':
      return { doctorWorkspace: seedDoctorWorkspace() };
    case 'hospital':
      return { hospitalWorkspace: seedHospitalWorkspace() };
    default:
      return {};
  }
}

export function createVisitCode(patientProfileId: string): VisitCode {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 1000 * 60 * 60 * 24);
  return {
    code: generateVisitCode(createdAt),
    patientProfileId,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}
