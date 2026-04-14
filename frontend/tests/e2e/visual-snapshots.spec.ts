import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

type Size = { name: string; width: number; height: number };
type AuthStorageState = {
  state: {
    user: DoctorUser;
    accessToken: string;
    refreshToken: string;
  };
  version: number;
};

type DoctorUser = {
  id: number;
  email: string;
  phone: string | null;
  role: 'doctor';
  twofa_enabled: boolean;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
  doctor_profile: {
    id: number;
    user: number;
    name: string;
    specialty: string;
    qualifications: string;
    bio: string;
    location: string;
    rating: number;
    calendar_connected: boolean;
  };
};

const doctorUser: DoctorUser = {
  id: 7,
  email: 'doctor@example.com',
  phone: '+1 555 0100',
  role: 'doctor',
  twofa_enabled: true,
  is_active: true,
  is_staff: true,
  created_at: '2024-01-01T09:00:00Z',
  doctor_profile: {
    id: 7,
    user: 7,
    name: 'Dr. Maya Patel',
    specialty: 'Internal Medicine',
    qualifications: 'MD, PhD',
    bio: 'Primary care and care coordination.',
    location: 'Main Hospital',
    rating: 4.9,
    calendar_connected: true,
  },
};

const authenticatedState: AuthStorageState = {
  state: {
    user: doctorUser,
    accessToken: 'visual-test-access-token',
    refreshToken: 'visual-test-refresh-token',
  },
  version: 0,
};

const appointmentsResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 101,
      doctor: 7,
      patient: 41,
      doctor_name: 'Dr. Maya Patel',
      specialty: 'Internal Medicine',
      patient_name: 'Amina Khan',
      patient_phone: '+1 555 0123',
      date: '2026-04-20',
      start_time: '10:00',
      end_time: '10:30',
      status: 'scheduled',
      notes: 'Routine follow-up',
      consent_granted: true,
      consent: 12,
      created_at: '2026-04-01T12:00:00Z',
    },
  ],
};

const consentsResponse = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 12,
      patient: 41,
      doctor: 7,
      status: 'active',
      granted_at: '2026-04-01T12:00:00Z',
      expires_at: null,
      access_level: 'records',
    },
    {
      id: 13,
      patient: 42,
      doctor: 7,
      status: 'active',
      granted_at: '2026-04-02T12:00:00Z',
      expires_at: null,
      access_level: 'records',
    },
  ],
};

const healthSummaryResponse = {
  vital_signs: [
    { type: 'blood_pressure', value: '120/80', unit: 'mmHg', timestamp: '2026-04-10T08:30:00Z', status: 'normal' },
    { type: 'heart_rate', value: '72', unit: 'bpm', timestamp: '2026-04-10T08:30:00Z', status: 'normal' },
  ],
  conditions: [
    { id: 1, name: 'Hypertension', severity: 'mild', diagnosed_date: '2024-02-10', status: 'managed' },
  ],
  allergies: [
    { id: 1, allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' },
  ],
  medications: [
    {
      id: 1,
      name: 'Lisinopril',
      dosage: '10 mg',
      frequency: 'Once daily',
      start_date: '2024-03-01',
      status: 'active',
    },
  ],
  last_checkup: '2026-04-08',
  next_appointment: '2026-04-20',
  health_score: 87,
  ai_insights: ['Vitals remain stable.', 'Medication adherence is good.'],
  summary: 'Stable chronic care profile with managed blood pressure and consistent follow-up.',
  bullets: ['Blood pressure controlled', 'No new allergies', 'Upcoming follow-up scheduled'],
  source_counts: { lab: 2, prescription: 1, encounter: 3, file: 4 },
  record_count: 10,
  date_range: { oldest: '2024-01-15', newest: '2026-04-10' },
  record_highlights: ['No acute concerns noted in the latest visits.'],
  professional_summary: 'The patient demonstrates stable chronic disease management and good follow-up adherence.',
  professional_findings: ['Hypertension is well controlled.', 'No urgent interventions are indicated.'],
};

const viewports: Size[] = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];

const routes = [
  '/',
  '/login',
  '/register',
  '/dashboard',
  '/appointments',
  '/patients',
  '/settings',
  '/records',
  '/health-summary',
  '/notifications',
];

async function prepareAuthenticatedDoctorPage(page: Page) {
  await page.addInitScript((state) => {
    localStorage.setItem('access_token', state.accessToken);
    localStorage.setItem('refresh_token', state.refreshToken);
    localStorage.setItem('auth-storage', JSON.stringify(state.authStorage));
  }, {
    accessToken: authenticatedState.state.accessToken,
    refreshToken: authenticatedState.state.refreshToken,
    authStorage: authenticatedState,
  });

  await page.route('**/api/auth/me/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doctorUser),
    });
  });

  await page.route('**/api/patients/appointments/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(appointmentsResponse),
    });
  });

  await page.route('**/api/consent/list/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(consentsResponse),
    });
  });

  await page.route('**/api/health/summary/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(healthSummaryResponse),
    });
  });
}

test.describe('Visual snapshots', () => {
  for (const route of routes) {
    for (const vp of viewports) {
      test(`${route} - ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });

        if (route === '/patients' || route === '/health-summary' || route === '/dashboard' || route === '/appointments' || route === '/settings' || route === '/records' || route === '/notifications') {
          await prepareAuthenticatedDoctorPage(page);
        }

        await page.goto(route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(200);

        if (route === '/patients') {
          await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible();
        }

        if (route === '/health-summary') {
          await expect(page.getByRole('heading', { name: 'Health Summary' })).toBeVisible();
        }

        const safeRoute = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-/, '');

        await expect(page).toHaveScreenshot(`${safeRoute}-${vp.name}.png`, {
          animations: 'disabled',
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  }
});
