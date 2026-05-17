import { z } from 'zod';

/**
 * Login request schema - email-based for Django backend
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Login response schema
 */
export const loginResponseSchema = z.object({
  access: z.string().optional(),
  refresh: z.string().optional(),
  user: z.object({
    id: z.number(),
    email: z.string().email(),
    phone: z.string().nullable(),
    role: z.enum(['patient', 'doctor', 'provider', 'admin']),
    twofa_enabled: z.boolean(),
    is_active: z.boolean(),
    is_staff: z.boolean(),
    created_at: z.string(),
  }),
  requires_2fa: z.boolean().optional(),
  pending_approval: z.boolean().optional(),
  message: z.string().optional(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * Register request schema - matches Django backend
 */
export const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    role: z.enum(['patient', 'doctor', 'provider'], {
      required_error: 'Please select a role',
    }),
    phone: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Backend expects a different structure with nested profiles
export interface RegisterInput {
  email: string;
  password: string;
  password_confirm: string;
  role: 'patient' | 'doctor' | 'provider';
  phone?: string;
  patient_profile?: {
    name: string;
    dob?: string;
    gender?: 'M' | 'F' | 'O' | 'N';
    blood_group?: string;
    address?: string;
    emergency_contact?: string;
  };
  doctor_profile?: {
    name: string;
    specialty?: string;
    qualifications?: string;
    bio?: string;
    location?: string;
  };
  provider_profile?: {
    organization_name: string;
    legal_name?: string;
    organization_type?: string;
    registration_number?: string;
    contact_person: string;
    phone: string;
    website?: string;
    address: string;
    district: string;
    description?: string;
  };
}

/**
 * 2FA verification schema
 */
export const twoFASchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'Code must be 6 digits'),
  purpose: z.enum(['2fa', 'consent']),
});

export type TwoFAInput = z.infer<typeof twoFASchema>;

/**
 * User profile schema
 */
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: z.enum(['patient', 'doctor', 'provider', 'admin']),
  twofa_enabled: z.boolean(),
  is_active: z.boolean(),
  is_staff: z.boolean(),
  created_at: z.string(),
});

export type User = z.infer<typeof userSchema>;

/**
 * Password Reset Request schema
 */
export const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password Reset schema
 */
export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;

/**
 * Registration Verification schema
 */
export const verifyRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Code must be 6 digits'),
});

export type VerifyRegistrationInput = z.infer<typeof verifyRegistrationSchema>;
