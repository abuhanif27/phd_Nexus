'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, Phone, User, Stethoscope, MapPin } from 'lucide-react';
import { authService } from '../api';

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    name: '',
    phone: '',
    specialty: '',
    qualifications: '',
    location: '',
    bio: '',
    dob: '',
    gender: '',
    blood_group: '',
    address: '',
    emergency_contact: '',
  });

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.password_confirm) return 'Passwords do not match';
    if (!formData.name) return 'Full name is required';
    if (formData.name.length < 2) return 'Name must be at least 2 characters';
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Validate
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        setIsLoading(false);
        return;
      }

      // Build payload
      const payload: any = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        role: role,
        phone: formData.phone || null,
      };

      if (role === 'patient') {
        payload.patient_profile = {
          name: formData.name,
          dob: formData.dob || null,
          gender: formData.gender || null,
          blood_group: formData.blood_group || null,
          address: formData.address || null,
          emergency_contact: formData.emergency_contact || null,
        };
      } else if (role === 'doctor') {
        payload.doctor_profile = {
          name: formData.name,
          specialty: formData.specialty || null,
          qualifications: formData.qualifications || null,
          bio: formData.bio || null,
          location: formData.location || null,
        };
      }

      console.log('📤 Submitting registration:', payload);

      // Submit to API
      const response = await authService.register(payload);

      console.log('✅ Registration successful:', response);

      // Save tokens
      if (response.access && response.refresh) {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
      }

      setSuccess('Account created successfully! Redirecting...');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      let message = 'Registration failed. Please try again.';

      if (err?.response?.data) {
        const resp = err.response.data;
        if (typeof resp === 'object') {
          const msgs: string[] = [];
          for (const v of Object.values(resp)) {
            if (Array.isArray(v)) {
              msgs.push(...v.map((item) => String(item)).filter((x) => !!x));
            } else if (typeof v === 'string') {
              msgs.push(v);
            }
          }
          if (msgs.length > 0) message = msgs.join(', ');
        } else if (typeof resp === 'string') {
          message = resp;
        }
      } else if (err?.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6 sm:mt-8">
      <div className="rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:p-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300">
            <p className="font-medium">❌ Error:</p>
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300">
            <p className="font-medium">✅ {success}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Role Selection - MANDATORY */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900 dark:text-gray-200">
              I am a <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-4 font-medium transition-all duration-200 ${
                  role === 'patient'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <User className="h-5 w-5" />
                <span>Patient</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('doctor')}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-4 font-medium transition-all duration-200 ${
                  role === 'doctor'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <Stethoscope className="h-5 w-5" />
                <span>Doctor</span>
              </button>
            </div>
          </div>

          {/* Full Name - MANDATORY */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                placeholder="John Doe"
              />
            </div>
          </div>

          {/* Email - MANDATORY */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                placeholder="john@example.com"
              />
            </div>
          </div>

          {/* Phone - OPTIONAL */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-900">
              Phone Number
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Phone className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          {/* Password - MANDATORY */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-900">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Confirm Password - MANDATORY */}
          <div>
            <label htmlFor="password_confirm" className="block text-sm font-semibold text-gray-900">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={handleInputChange}
                className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Patient-specific fields */}
          {role === 'patient' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Date of Birth - OPTIONAL */}
                <div>
                  <label htmlFor="dob" className="block text-sm font-semibold text-gray-900">
                    Date of Birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  />
                </div>

                {/* Gender - OPTIONAL */}
                <div>
                  <label htmlFor="gender" className="block text-sm font-semibold text-gray-900">
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
                <label htmlFor="blood_group" className="block text-sm font-semibold text-gray-900">
                  Blood Group
                </label>
                <select
                  id="blood_group"
                  value={formData.blood_group}
                  onChange={handleInputChange}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
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
                  className="block text-sm font-semibold text-gray-900"
                >
                  Emergency Contact
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="emergency_contact"
                    type="tel"
                    value={formData.emergency_contact}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              {/* Address - OPTIONAL */}
              <div>
                <label htmlFor="address" className="block text-sm font-semibold text-gray-900">
                  Address
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  placeholder="Street address, city, state, zip code"
                />
              </div>
            </>
          )}

          {/* Doctor-specific fields */}
          {role === 'doctor' && (
            <>
              {/* Specialty - OPTIONAL */}
              <div>
                <label htmlFor="specialty" className="block text-sm font-semibold text-gray-900">
                  Specialty
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Stethoscope className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  >
                    <option value="">Select Specialty...</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Pulmonology">Pulmonology</option>
                    <option value="Gastroenterology">Gastroenterology</option>
                    <option value="ENT">ENT (Ear, Nose & Throat)</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Ophthalmology">Ophthalmology</option>
                    <option value="Psychiatry">Psychiatry</option>
                    <option value="Gynecology">Gynecology</option>
                    <option value="Urology">Urology</option>
                    <option value="Rheumatology">Rheumatology</option>
                    <option value="General Physician">General Physician</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Oncology">Oncology</option>
                    <option value="Endocrinology">Endocrinology</option>
                  </select>
                </div>
              </div>

              {/* Qualifications - OPTIONAL */}
              <div>
                <label htmlFor="qualifications" className="block text-sm font-semibold text-gray-900">
                  Qualifications
                </label>
                <textarea
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  placeholder="MD, MBBS, etc."
                />
              </div>

              {/* Location - OPTIONAL */}
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-900">
                  Location
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    placeholder="City, State"
                  />
                </div>
              </div>

              {/* Bio - OPTIONAL */}
              <div>
                <label htmlFor="bio" className="block text-sm font-semibold text-gray-900">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </>
          )}
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
          >
            <UserPlus className="h-5 w-5" />
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600 dark:text-gray-300">Already have an account? </span>
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </div>

        {/* Required Fields Note */}
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>
    </form>
  );
}
