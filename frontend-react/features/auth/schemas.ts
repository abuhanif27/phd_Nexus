import { z } from 'zod';

/**
 * Login request schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Login response schema
 */
export const loginResponseSchema = z.object({
  access: z.string(),
  refresh: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string().email(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * Register request schema
 */
export const registerSchema = z
  .object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * User profile schema
 */
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dateJoined: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;
