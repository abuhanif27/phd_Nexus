'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Lock, Phone, User, Stethoscope, MapPin, Building2, Upload } from 'lucide-react';
import { authService } from '../api';
import { LocationPicker } from '@/components/ui/LocationPicker';

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [role, setRole] = useState<'patient' | 'doctor' | 'provider'>('patient');
  const [organizationLogo, setOrganizationLogo] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    name: '',
    phone: '',
    provider_phone: '',
    specialty: '',
    qualifications: '',
    location: '',
    bio: '',
    description: '',
    dob: '',
    gender: '',
    blood_group: '',
    address: '',
    emergency_contact: '',
    district: '',
    organization_name: '',
    legal_name: '',
    organization_type: 'diagnostic_center',
    registration_number: '',
    contact_person: '',
    website: '',
    latitude: null as number | null,
    longitude: null as number | null,
    google_place_id: '',
  });

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleLocationSelect = (loc: { address: string; latitude: number; longitude: number; google_place_id: string }) => {
    setFormData((prev) => ({
      ...prev,
      address: loc.address,
      location: loc.address, // For doctors
      latitude: loc.latitude,
      longitude: loc.longitude,
      google_place_id: loc.google_place_id,
    }));
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!formData.email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 8) return 'Password must be at least 8 characters';
    if (formData.password !== formData.password_confirm) return 'Passwords do not match';
    if (role !== 'provider' && !formData.name) return 'Full name is required';
    if (role !== 'provider' && formData.name.length < 2) return 'Name must be at least 2 characters';

    // Check role-specific requirements
    if (role === 'doctor' && !formData.specialty) {
      return 'Specialty is required for doctors';
    }
    if (role === 'provider') {
      if (!formData.organization_name) return 'Organization name is required';
      if (!formData.contact_person) return 'Contact person is required';
      if (!formData.provider_phone && !formData.phone) return 'Organization phone number is required';
      if (!formData.address) return 'Organization address is required';
      if (!formData.district) return 'District is required';
    }

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

      let payload: any = {
        email: formData.email,
        password: formData.password,
        password_confirm: formData.password_confirm,
        role: role,
      };

      // Only add phone if provided
      if (formData.phone) {
        payload.phone = formData.phone;
      }

      if (role === 'patient') {
        const patientProfile: any = {
          name: formData.name,
        };
        // Only add optional fields if they have values
        if (formData.dob) patientProfile.dob = formData.dob;
        if (formData.gender) patientProfile.gender = formData.gender;
        if (formData.blood_group) patientProfile.blood_group = formData.blood_group;
        if (formData.address) patientProfile.address = formData.address;
        if (formData.latitude) patientProfile.latitude = formData.latitude;
        if (formData.longitude) patientProfile.longitude = formData.longitude;
        if (formData.google_place_id) patientProfile.google_place_id = formData.google_place_id;
        if (formData.emergency_contact)
          patientProfile.emergency_contact = formData.emergency_contact;
        payload.patient_profile = patientProfile;
      } else if (role === 'doctor') {
        const doctorProfile: any = {
          name: formData.name,
          specialty: formData.specialty,
        };
        // Only add optional fields if they have values
        if (formData.qualifications) doctorProfile.qualifications = formData.qualifications;
        if (formData.bio) doctorProfile.bio = formData.bio;
        if (formData.location) doctorProfile.location = formData.location;
        if (formData.latitude) doctorProfile.latitude = formData.latitude;
        if (formData.longitude) doctorProfile.longitude = formData.longitude;
        if (formData.google_place_id) doctorProfile.google_place_id = formData.google_place_id;
        payload.doctor_profile = doctorProfile;
      } else if (role === 'provider') {
        const providerProfile: any = {
          organization_name: formData.organization_name,
          organization_type: formData.organization_type,
          contact_person: formData.contact_person,
          phone: formData.provider_phone || formData.phone,
          address: formData.address,
          district: formData.district,
        };
        if (formData.legal_name) providerProfile.legal_name = formData.legal_name;
        if (formData.registration_number)
          providerProfile.registration_number = formData.registration_number;
        if (formData.website) providerProfile.website = formData.website;
        if (formData.description) providerProfile.description = formData.description;
        if (formData.latitude) providerProfile.latitude = formData.latitude;
        if (formData.longitude) providerProfile.longitude = formData.longitude;
        if (formData.google_place_id) providerProfile.google_place_id = formData.google_place_id;

        if (organizationLogo) {
          const formPayload = new FormData();
          formPayload.append('email', formData.email);
          formPayload.append('password', formData.password);
          formPayload.append('password_confirm', formData.password_confirm);
          formPayload.append('role', role);
          if (formData.phone || formData.provider_phone)
            formPayload.append('phone', formData.phone || formData.provider_phone);
          formPayload.append('provider_profile', JSON.stringify(providerProfile));
          formPayload.append('organization_logo', organizationLogo);
          payload = formPayload;
        } else {
          payload.provider_profile = providerProfile;
        }
      }

      // Submit to API
      const response = await authService.register(payload);

      if (response.requires_verification) {
        setSuccess('Account created! Please check your email for the verification code.');
        setTimeout(() => {
          router.push(`/verify-registration?email=${encodeURIComponent(formData.email)}`);
        }, 1500);
        return;
      }

      if (response.pending_approval) {
        setSuccess(response.message || 'Account created successfully! Please wait for admin approval.');
        setIsLoading(false);
        return;
      }

      setSuccess('Account created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      let message = 'Registration failed. Please try again.';

      // Helper function to extract text from HTML
      const extractTextFromHTML = (html: string): string => {
        if (!html) return '';
        // Remove HTML tags
        return html.replace(/<[^>]*>/g, '').trim();
      };

      if (err?.response?.data) {
        const resp = err.response.data;
        
        // Handle the new 'details' field for better error reporting
        if (resp.details) {
          const details = resp.details;
          if (typeof details === 'object') {
            const msgs: string[] = [];
            for (const [key, v] of Object.entries(details)) {
              const label = key === 'non_field_errors' ? '' : `${key}: `;
              if (Array.isArray(v)) {
                msgs.push(...v.map((item) => `${label}${String(item)}`).filter((x) => !!x));
              } else if (typeof v === 'string') {
                msgs.push(`${label}${extractTextFromHTML(v)}`);
              } else if (typeof v === 'object' && v !== null) {
                msgs.push(`${label}${JSON.stringify(v)}`);
              }
            }
            if (msgs.length > 0) message = msgs.join(', ');
          } else {
            message = extractTextFromHTML(String(details));
          }
        } else if (typeof resp === 'object') {
          const msgs: string[] = [];
          for (const v of Object.values(resp)) {
            if (Array.isArray(v)) {
              msgs.push(...v.map((item) => String(item)).filter((x) => !!x));
            } else if (typeof v === 'string') {
              msgs.push(extractTextFromHTML(v));
            }
          }
          if (msgs.length > 0) message = msgs.join(', ');
        } else if (typeof resp === 'string') {
          message = extractTextFromHTML(resp);
        }
      } else if (err?.response?.status === 500 || err?.response?.status === 503) {
        message = 'Server error. Please try again later or contact support.';
      } else if (err?.message) {
        message = extractTextFromHTML(err.message);
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
          <div className="mb-6 rounded-lg border-2 border-red-500 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-200">
            <p className="flex items-center gap-2 font-bold">
              <span>⚠️</span> Error
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border-2 border-green-500 bg-green-50 p-4 text-sm text-green-900 dark:border-green-500 dark:bg-green-950 dark:text-green-200">
            <p className="flex items-center gap-2 font-bold">
              <span>✅</span> Success
            </p>
            <p className="mt-2">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Role Selection - MANDATORY */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-900 dark:text-gray-200">
              I am a <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-4 font-medium transition-all duration-200 ${
                  role === 'provider'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200'
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span>Provider</span>
              </button>
            </div>
          </div>

          {role !== 'provider' && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
              >
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
          )}

          {/* Email - MANDATORY */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
            >
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
            <label
              htmlFor="phone"
              className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
            >
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
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
            >
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
            <label
              htmlFor="password_confirm"
              className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
            >
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
                  <label
                    htmlFor="dob"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Date of Birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                  />
                </div>

                {/* Gender - OPTIONAL */}
                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Gender
                  </label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
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
                <label
                  htmlFor="blood_group"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Blood Group
                </label>
                <select
                  id="blood_group"
                  value={formData.blood_group}
                  onChange={handleInputChange}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
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
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
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
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              {/* Address - OPTIONAL */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Address
                </label>
                <LocationPicker onLocationSelect={handleLocationSelect} defaultAddress={formData.address} />
              </div>
            </>
          )}

          {/* Doctor-specific fields */}
          {role === 'doctor' && (
            <>
              {/* Specialty - MANDATORY */}
              <div>
                <label
                  htmlFor="specialty"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Specialty <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Stethoscope className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
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
                <label
                  htmlFor="qualifications"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Qualifications
                </label>
                <textarea
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                  placeholder="MD, MBBS, etc."
                />
              </div>

              {/* Location - OPTIONAL */}
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Location
                </label>
                <LocationPicker onLocationSelect={handleLocationSelect} defaultAddress={formData.location} />
              </div>

              {/* Bio - OPTIONAL */}
              <div>
                <label
                  htmlFor="bio"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </>
          )}

          {role === 'provider' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="organization_name"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="organization_name"
                      type="text"
                      value={formData.organization_name}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                      placeholder="Dhaka Diagnostic Center"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="legal_name"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Legal Name
                  </label>
                  <input
                    id="legal_name"
                    type="text"
                    value={formData.legal_name}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                    placeholder="Registered company name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="organization_type"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Organization Type
                  </label>
                  <select
                    id="organization_type"
                    value={formData.organization_type}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                  >
                    <option value="hospital">Hospital</option>
                    <option value="diagnostic_center">Diagnostic Center</option>
                    <option value="clinic">Clinic</option>
                    <option value="lab">Laboratory</option>
                    <option value="imaging_center">Imaging Center</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="registration_number"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Trade License / Registration No.
                  </label>
                  <input
                    id="registration_number"
                    type="text"
                    value={formData.registration_number}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                    placeholder="Optional but recommended"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact_person"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact_person"
                    type="text"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                    placeholder="Operations manager"
                  />
                </div>
                <div>
                  <label
                    htmlFor="provider_phone"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    Organization Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-2">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="provider_phone"
                      type="tel"
                      value={formData.provider_phone}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                      placeholder="+880 1XXX XXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="district"
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                  >
                    District <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="district"
                    type="text"
                    value={formData.district}
                    onChange={handleInputChange}
                    className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                    placeholder="Dhaka"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="website"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={handleInputChange}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Organization Address <span className="text-red-500">*</span>
                </label>
                <LocationPicker onLocationSelect={handleLocationSelect} defaultAddress={formData.address} />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-gray-900 dark:text-gray-200"
                >
                  Organization Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100"
                  placeholder="Diagnostic services, branches, support hours..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-200">
                  Organization Logo
                </label>
                <label className="mt-2 flex cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-700 transition hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span>{organizationLogo ? organizationLogo.name : 'Upload logo image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => setOrganizationLogo(event.target.files?.[0] ?? null)}
                  />
                </label>
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
