import { describe, expect, it } from 'vitest';
import {
  calculateHospitalMetrics,
  createVisitCode,
  seedPatientWorkspace,
  suggestSpecialistFromText,
} from '@/features/portal/utils';

describe('portal utils', () => {
  it('suggests a cardiologist for chest symptoms', () => {
    const result = suggestSpecialistFromText('I have chest pressure and palpitations');
    expect(result.specialist).toBe('Cardiologist');
    expect(result.urgency).toBe('priority');
  });

  it('calculates hospital metrics from spreadsheet rows', () => {
    const metrics = calculateHospitalMetrics([
      {
        id: '1',
        department: 'Medicine',
        patients: 100,
        revenue: 1000,
        expenses: 700,
        beds: 20,
        occupiedBeds: 10,
        doctors: 5,
        avgWaitMinutes: 20,
        testsRun: 50,
      },
      {
        id: '2',
        department: 'Emergency',
        patients: 50,
        revenue: 500,
        expenses: 200,
        beds: 10,
        occupiedBeds: 10,
        doctors: 5,
        avgWaitMinutes: 10,
        testsRun: 25,
      },
    ]);

    expect(metrics.totalPatients).toBe(150);
    expect(metrics.netRevenue).toBe(600);
    expect(metrics.occupancyRate).toBe(66.7);
  });

  it('creates visit codes and seeded patient workspace data', () => {
    const visitCode = createVisitCode('patient-1');
    const workspace = seedPatientWorkspace();

    expect(visitCode.patientProfileId).toBe('patient-1');
    expect(visitCode.code.startsWith('NC-')).toBe(true);
    expect(workspace.records.length).toBeGreaterThan(0);
    expect(workspace.reminders.length).toBeGreaterThan(0);
  });
});