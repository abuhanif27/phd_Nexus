import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ChatMessage,
  DoctorWorkspace,
  EntryProfile,
  HospitalDepartmentRow,
  HospitalWorkspace,
  PatientWorkspace,
  PortalRole,
  PrescriptionCategory,
  PrescriptionTemplate,
  VisitCode,
} from '@/types/portal';
import {
  buildDoctorAiSummary,
  createId,
  createVisitCode,
  seedWorkspaceByRole,
  suggestSpecialistFromText,
} from '@/features/portal/utils';

export const PORTAL_STORAGE_KEY = 'portal-workspace';

interface RegisterProfileInput {
  role: PortalRole;
  name: string;
  phone?: string;
  email?: string;
  specialty?: string;
  hospitalName?: string;
}

interface PortalState {
  profiles: EntryProfile[];
  activeProfileId: string | null;
  patientWorkspaces: Record<string, PatientWorkspace>;
  doctorWorkspaces: Record<string, DoctorWorkspace>;
  hospitalWorkspaces: Record<string, HospitalWorkspace>;
  visitCodes: VisitCode[];
  registerProfile: (input: RegisterProfileInput) => EntryProfile;
  setActiveProfile: (profileId: string) => void;
  clearActiveProfile: () => void;
  createPatientVisitCode: (patientProfileId: string) => VisitCode;
  sendPatientChatMessage: (patientProfileId: string, text: string) => void;
  updateReminder: (
    patientProfileId: string,
    reminderId: string,
    updates: { enabled?: boolean; time?: string }
  ) => void;
  markReminderTriggered: (patientProfileId: string, reminderId: string, isoStamp: string) => void;
  resolveVisitCodeForDoctor: (
    doctorProfileId: string,
    code: string
  ) => { success: boolean; patientProfileId?: string };
  addDraftTemplate: (
    doctorProfileId: string,
    category: PrescriptionCategory,
    template: PrescriptionTemplate
  ) => void;
  removeDraftTemplate: (
    doctorProfileId: string,
    category: PrescriptionCategory,
    templateId: string
  ) => void;
  clearDoctorDraft: (doctorProfileId: string) => void;
  updateHospitalRow: (
    hospitalProfileId: string,
    rowId: string,
    patch: Partial<HospitalDepartmentRow>
  ) => void;
  addHospitalRow: (hospitalProfileId: string) => void;
}

function createProfile(input: RegisterProfileInput): EntryProfile {
  return {
    id: createId('profile'),
    role: input.role,
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    email: input.email?.trim() || undefined,
    specialty: input.specialty?.trim() || undefined,
    hospitalName: input.hospitalName?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

export const usePortalStore = create<PortalState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      patientWorkspaces: {},
      doctorWorkspaces: {},
      hospitalWorkspaces: {},
      visitCodes: [],
      registerProfile: (input) => {
        const profile = createProfile(input);
        const seeded = seedWorkspaceByRole(profile.role);

        set((state) => ({
          profiles: [profile, ...state.profiles],
          activeProfileId: profile.id,
          patientWorkspaces: seeded.patientWorkspace
            ? { ...state.patientWorkspaces, [profile.id]: seeded.patientWorkspace }
            : state.patientWorkspaces,
          doctorWorkspaces: seeded.doctorWorkspace
            ? { ...state.doctorWorkspaces, [profile.id]: seeded.doctorWorkspace }
            : state.doctorWorkspaces,
          hospitalWorkspaces: seeded.hospitalWorkspace
            ? { ...state.hospitalWorkspaces, [profile.id]: seeded.hospitalWorkspace }
            : state.hospitalWorkspaces,
        }));

        return profile;
      },
      setActiveProfile: (profileId) => {
        set({ activeProfileId: profileId });
      },
      clearActiveProfile: () => {
        set({ activeProfileId: null });
      },
      createPatientVisitCode: (patientProfileId) => {
        const visitCode = createVisitCode(patientProfileId);
        set((state) => ({
          visitCodes: [
            visitCode,
            ...state.visitCodes.filter((item) => item.patientProfileId !== patientProfileId),
          ],
          patientWorkspaces: {
            ...state.patientWorkspaces,
            [patientProfileId]: {
              ...state.patientWorkspaces[patientProfileId],
              latestVisitCode: visitCode,
            },
          },
        }));
        return visitCode;
      },
      sendPatientChatMessage: (patientProfileId, text) => {
        const trimmed = text.trim();
        if (!trimmed) {
          return;
        }

        const suggestion = suggestSpecialistFromText(trimmed);
        const createdAt = new Date().toISOString();
        const userMessage: ChatMessage = {
          id: createId('chat'),
          sender: 'user',
          text: trimmed,
          createdAt,
        };
        const assistantMessage: ChatMessage = {
          id: createId('chat'),
          sender: 'assistant',
          text: `${suggestion.specialist} is the best next step. ${suggestion.reason}`,
          createdAt,
          suggestion,
        };

        set((state) => ({
          patientWorkspaces: {
            ...state.patientWorkspaces,
            [patientProfileId]: {
              ...state.patientWorkspaces[patientProfileId],
              chatMessages: [
                ...state.patientWorkspaces[patientProfileId].chatMessages,
                userMessage,
                assistantMessage,
              ],
            },
          },
        }));
      },
      updateReminder: (patientProfileId, reminderId, updates) => {
        set((state) => ({
          patientWorkspaces: {
            ...state.patientWorkspaces,
            [patientProfileId]: {
              ...state.patientWorkspaces[patientProfileId],
              reminders: state.patientWorkspaces[patientProfileId].reminders.map((reminder) =>
                reminder.id === reminderId ? { ...reminder, ...updates } : reminder
              ),
            },
          },
        }));
      },
      markReminderTriggered: (patientProfileId, reminderId, isoStamp) => {
        set((state) => ({
          patientWorkspaces: {
            ...state.patientWorkspaces,
            [patientProfileId]: {
              ...state.patientWorkspaces[patientProfileId],
              reminders: state.patientWorkspaces[patientProfileId].reminders.map((reminder) =>
                reminder.id === reminderId ? { ...reminder, lastTriggeredAt: isoStamp } : reminder
              ),
            },
          },
        }));
      },
      resolveVisitCodeForDoctor: (doctorProfileId, code) => {
        const cleanCode = code.trim().toUpperCase();
        const matchedCode = get().visitCodes.find(
          (item) =>
            item.code.toUpperCase() === cleanCode && new Date(item.expiresAt).getTime() > Date.now()
        );

        if (!matchedCode) {
          return { success: false };
        }

        set((state) => ({
          doctorWorkspaces: {
            ...state.doctorWorkspaces,
            [doctorProfileId]: {
              ...state.doctorWorkspaces[doctorProfileId],
              linkedPatientProfileId: matchedCode.patientProfileId,
              resolvedVisitCode: matchedCode.code,
            },
          },
        }));

        return { success: true, patientProfileId: matchedCode.patientProfileId };
      },
      addDraftTemplate: (doctorProfileId, category, template) => {
        set((state) => {
          const current = state.doctorWorkspaces[doctorProfileId];
          const exists = current.draft[category].some((item) => item.id === template.id);
          if (exists) {
            return state;
          }

          return {
            doctorWorkspaces: {
              ...state.doctorWorkspaces,
              [doctorProfileId]: {
                ...current,
                draft: {
                  ...current.draft,
                  [category]: [...current.draft[category], template],
                },
              },
            },
          };
        });
      },
      removeDraftTemplate: (doctorProfileId, category, templateId) => {
        set((state) => ({
          doctorWorkspaces: {
            ...state.doctorWorkspaces,
            [doctorProfileId]: {
              ...state.doctorWorkspaces[doctorProfileId],
              draft: {
                ...state.doctorWorkspaces[doctorProfileId].draft,
                [category]: state.doctorWorkspaces[doctorProfileId].draft[category].filter(
                  (item) => item.id !== templateId
                ),
              },
            },
          },
        }));
      },
      clearDoctorDraft: (doctorProfileId) => {
        set((state) => ({
          doctorWorkspaces: {
            ...state.doctorWorkspaces,
            [doctorProfileId]: {
              ...state.doctorWorkspaces[doctorProfileId],
              draft: {
                condition: [],
                advice: [],
                test: [],
                medicine: [],
              },
            },
          },
        }));
      },
      updateHospitalRow: (hospitalProfileId, rowId, patch) => {
        set((state) => ({
          hospitalWorkspaces: {
            ...state.hospitalWorkspaces,
            [hospitalProfileId]: {
              ...state.hospitalWorkspaces[hospitalProfileId],
              rows: state.hospitalWorkspaces[hospitalProfileId].rows.map((row) =>
                row.id === rowId ? { ...row, ...patch } : row
              ),
            },
          },
        }));
      },
      addHospitalRow: (hospitalProfileId) => {
        set((state) => ({
          hospitalWorkspaces: {
            ...state.hospitalWorkspaces,
            [hospitalProfileId]: {
              ...state.hospitalWorkspaces[hospitalProfileId],
              rows: [
                ...state.hospitalWorkspaces[hospitalProfileId].rows,
                {
                  id: createId('row'),
                  department: 'New Unit',
                  patients: 0,
                  revenue: 0,
                  expenses: 0,
                  beds: 0,
                  occupiedBeds: 0,
                  doctors: 0,
                  avgWaitMinutes: 0,
                  testsRun: 0,
                },
              ],
            },
          },
        }));
      },
    }),
    {
      name: PORTAL_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        patientWorkspaces: state.patientWorkspaces,
        doctorWorkspaces: state.doctorWorkspaces,
        hospitalWorkspaces: state.hospitalWorkspaces,
        visitCodes: state.visitCodes,
      }),
    }
  )
);

export function getStoredActivePortalId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(PORTAL_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { state?: { activeProfileId?: string | null } };
    return parsed.state?.activeProfileId ?? null;
  } catch {
    return null;
  }
}

export function getDoctorSummaryFromState(
  patientProfile: EntryProfile | undefined,
  workspace: PatientWorkspace | undefined
): string[] {
  if (!patientProfile || !workspace) {
    return [];
  }
  return buildDoctorAiSummary(patientProfile, workspace);
}
