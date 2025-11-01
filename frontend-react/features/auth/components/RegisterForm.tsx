'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, Phone, User, Stethoscope, Calendar, MapPin } from 'lucide-react';
import { authService } from '../api';

// Registration schema based on backend models
const registerSchema = z
  .object({
    // User model - MANDATORY fields
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirm: z.string(),
    role: z.enum(['patient', 'doctor'], {
      required_error: 'Please select a role',
    }),

    // User model - OPTIONAL
    phone: z.string().optional(),

    // Profile fields - MANDATORY for proper setup
    name: z.string().min(2, 'Name must be at least 2 characters'),

    // Patient-specific OPTIONAL fields
    dob: z.string().optional(),
    gender: z.enum(['M', 'F', 'O', 'N']).optional(),
    blood_group: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    address: z.string().optional(),
    emergency_contact: z.string().optional(),

    // Doctor-specific OPTIONAL fields
    specialty: z.string().optional(),
    qualifications: z.string().optional(),
    bio: z.string().optional(),
    location: z.string().optional(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords don't match",
    path: ['password_confirm'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'patient',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Prepare the payload for backend
      const payload: any = {
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
        role: data.role,
        phone: data.phone,
      };

      // Add profile fields based on role
      if (data.role === 'patient') {
        payload.patient_profile = {
          name: data.name,
          dob: data.dob,
          gender: data.gender,
          blood_group: data.blood_group,
          address: data.address,
          emergency_contact: data.emergency_contact,
        };
      } else if (data.role === 'doctor') {
        payload.doctor_profile = {
          name: data.name,
          specialty: data.specialty,
          qualifications: data.qualifications,
          bio: data.bio,
          location: data.location,
        };
      }

      // Call register API
      const response = await authService.register(payload);

      // Save tokens
      if (response.access) {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
      <div className="rounded-2xl bg-white p-8 shadow-2xl">
        {error && <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}

        <div className="space-y-5">
          {/* Role Selection - MANDATORY */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              I am a <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                  selectedRole === 'patient'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input type="radio" value="patient" {...register('role')} className="sr-only" />
                <User className="mr-2 h-5 w-5" />
                <span className="font-medium">Patient</span>
              </label>
              <label
                className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-4 transition-all ${
                  selectedRole === 'doctor'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <input type="radio" value="doctor" {...register('role')} className="sr-only" />
                <Stethoscope className="mr-2 h-5 w-5" />
                <span className="font-medium">Doctor</span>
              </label>
            </div>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
          </div>

          {/* Full Name - MANDATORY */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="name"
                type="text"
                {...register('name')}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Email - MANDATORY */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="john@example.com"
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          {/* Phone - OPTIONAL */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          {/* Password - MANDATORY */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password - MANDATORY */}
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-medium text-gray-700">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password_confirm"
                type="password"
                {...register('password_confirm')}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            {errors.password_confirm && (
              <p className="mt-1 text-sm text-red-600">{errors.password_confirm.message}</p>
            )}
          </div>

          {/* Patient-specific fields */}
          {selectedRole === 'patient' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Date of Birth - OPTIONAL */}
                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="dob"
                      type="date"
                      {...register('dob')}
                      className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Gender - OPTIONAL */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <select
                    id="gender"
                    {...register('gender')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                    <option value="N">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Blood Group - OPTIONAL */}
              <div>
                <label htmlFor="blood_group" className="block text-sm font-medium text-gray-700">
                  Blood Group
                </label>
                <select
                  id="blood_group"
                  {...register('blood_group')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Emergency Contact - OPTIONAL */}
              <div>
                <label
                  htmlFor="emergency_contact"
                  className="block text-sm font-medium text-gray-700"
                >
                  Emergency Contact
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="emergency_contact"
                    type="tel"
                    {...register('emergency_contact')}
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              {/* Address - OPTIONAL */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  id="address"
                  {...register('address')}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Street address, city, state, zip code"
                />
              </div>
            </>
          )}

          {/* Doctor-specific fields */}
          {selectedRole === 'doctor' && (
            <>
              {/* Specialty - OPTIONAL */}
              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                  Specialty
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Stethoscope className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="specialty"
                    type="text"
                    {...register('specialty')}
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="Cardiology, Neurology, etc."
                  />
                </div>
              </div>

              {/* Qualifications - OPTIONAL */}
              <div>
                <label htmlFor="qualifications" className="block text-sm font-medium text-gray-700">
                  Qualifications
                </label>
                <textarea
                  id="qualifications"
                  {...register('qualifications')}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="MD, MBBS, etc."
                />
              </div>

              {/* Location - OPTIONAL */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="location"
                    type="text"
                    {...register('location')}
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="City, State"
                  />
                </div>
              </div>

              {/* Bio - OPTIONAL */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <textarea
                  id="bio"
                  {...register('bio')}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <UserPlus className="h-5 w-5" />
            </span>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-4 text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </div>

        {/* Required Fields Note */}
        <p className="mt-4 text-center text-xs text-gray-500">
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>
    </form>
  );
}
