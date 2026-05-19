'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, Mail, Lock, User, Stethoscope, MapPin, 
  Building2, Upload, ArrowRight, ArrowLeft, CheckCircle2,
  ShieldCheck, HeartPulse, Hospital, ClipboardCheck
} from 'lucide-react';
import { authService } from '../api';
import { LocationPicker } from '@/components/ui/LocationPicker';

type Step = 'role' | 'account' | 'profile';

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // UI State
  const [currentStep, setCurrentStep] = useState<Step>('role');
  const [role, setRole] = useState<'patient' | 'doctor' | 'provider'>('patient');
  const [organizationLogo, setOrganizationLogo] = useState<File | null>(null);
  
  // Form state
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

  const handleLocationSelect = (loc: { address: string; latitude: number; longitude: number; google_place_id: string } | null) => {
    if (!loc) {
      setFormData((prev) => ({
        ...prev,
        address: '',
        location: '',
        latitude: null,
        longitude: null,
        google_place_id: '',
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      address: loc.address,
      location: loc.address, // For doctors
      latitude: loc.latitude,
      longitude: loc.longitude,
      google_place_id: loc.google_place_id,
    }));
  };

  // Validate specific steps
  const validateStep = (step: Step): string | null => {
    if (step === 'account') {
      if (!formData.email) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email format';
      if (!formData.password) return 'Password is required';
      if (formData.password.length < 8) return 'Password must be at least 8 characters';
      if (formData.password !== formData.password_confirm) return 'Passwords do not match';
      
      const bdPhoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
      if (formData.phone && !bdPhoneRegex.test(formData.phone)) {
        return 'Invalid phone number. Use format: 01XXXXXXXXX (11 digits)';
      }
    }
    
    if (step === 'profile') {
      if (role !== 'provider' && !formData.name) return 'Full name is required';
      if (role === 'doctor' && !formData.specialty) return 'Specialty is required';
      
      if (role === 'provider') {
        if (!formData.organization_name) return 'Organization name is required';
        if (!formData.contact_person) return 'Contact person is required';
        if (!formData.provider_phone && !formData.phone) return 'Organization phone number is required';
        
        const bdPhoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
        if (formData.provider_phone && !bdPhoneRegex.test(formData.provider_phone)) {
          return 'Invalid organization phone. Use format: 01XXXXXXXXX (11 digits)';
        }
        if (!formData.address) return 'Organization address is required';
        if (!formData.district) return 'District is required';
      }

      if (role === 'patient') {
        const bdPhoneRegex = /^(?:\+88)?01[3-9]\d{8}$/;
        if (formData.emergency_contact && !bdPhoneRegex.test(formData.emergency_contact)) {
          return 'Invalid emergency contact number. Use format: 01XXXXXXXXX (11 digits)';
        }
      }
    }
    
    return null;
  };

  const nextStep = () => {
    const error = validateStep(currentStep);
    if (error) {
      setError(error);
      return;
    }
    setError(null);
    if (currentStep === 'role') setCurrentStep('account');
    else if (currentStep === 'account') setCurrentStep('profile');
  };

  const prevStep = () => {
    setError(null);
    if (currentStep === 'profile') setCurrentStep('account');
    else if (currentStep === 'account') setCurrentStep('role');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (currentStep !== 'profile') {
      nextStep();
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Final validation
      const validationError = validateStep('profile');
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

      if (formData.phone) {
        payload.phone = formData.phone;
      }

      if (role === 'patient') {
        const patientProfile: any = { name: formData.name };
        if (formData.dob) patientProfile.dob = formData.dob;
        if (formData.gender) patientProfile.gender = formData.gender;
        if (formData.blood_group) patientProfile.blood_group = formData.blood_group;
        if (formData.address) patientProfile.address = formData.address;
        if (formData.latitude) patientProfile.latitude = formData.latitude;
        if (formData.longitude) patientProfile.longitude = formData.longitude;
        if (formData.google_place_id) patientProfile.google_place_id = formData.google_place_id;
        if (formData.emergency_contact) patientProfile.emergency_contact = formData.emergency_contact;
        payload.patient_profile = patientProfile;
      } else if (role === 'doctor') {
        const doctorProfile: any = { name: formData.name, specialty: formData.specialty };
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
        if (formData.registration_number) providerProfile.registration_number = formData.registration_number;
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

      const response = await authService.register(payload);

      if (response.requires_verification) {
        setSuccess('Account created! Verification code sent.');
        setTimeout(() => {
          router.push(`/verify-registration?email=${encodeURIComponent(formData.email)}`);
        }, 1500);
        return;
      }

      if (response.pending_approval) {
        setSuccess(response.message || 'Account created! Waiting for approval.');
        setIsLoading(false);
        return;
      }

      setSuccess('Welcome to PhD NexusCare!');
      setTimeout(() => router.push('/dashboard'), 1000);
    } catch (err: any) {
      console.error('❌ Registration error:', err);
      let message = 'Registration failed. Please try again.';
      if (err?.response?.data) {
        const resp = err.response.data;
        if (resp.details) {
          if (typeof resp.details === 'object') {
             message = Object.entries(resp.details).map(([k, v]) => `${k}: ${v}`).join(', ');
          } else message = String(resp.details);
        }
      }
      setError(message.replace(/<[^>]*>/g, ''));
    } finally {
      setIsLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="mb-8 flex items-center justify-between px-2">
      {[
        { id: 'role', label: 'Identity', icon: ShieldCheck },
        { id: 'account', label: 'Security', icon: Lock },
        { id: 'profile', label: 'Profile', icon: ClipboardCheck },
      ].map((s, i) => (
        <div key={s.id} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
              currentStep === s.id 
                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                : ['account', 'profile'].includes(currentStep) && i < ['role', 'account', 'profile'].indexOf(currentStep)
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-200 bg-white text-gray-400 dark:border-slate-700 dark:bg-slate-800'
            }`}>
              {['account', 'profile'].includes(currentStep) && i < ['role', 'account', 'profile'].indexOf(currentStep) ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <s.icon className="h-5 w-5" />
              )}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${
              currentStep === s.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
            }`}>
              {s.label}
            </span>
          </div>
          {i < 2 && (
            <div className={`mx-4 h-0.5 flex-1 rounded-full transition-all duration-500 ${
              (['account', 'profile'].includes(currentStep) && i === 0) || (currentStep === 'profile' && i === 1)
                ? 'bg-green-500' 
                : 'bg-gray-200 dark:bg-slate-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <StepIndicator />
      
      <form onSubmit={handleSubmit} className="relative transition-all duration-300">
        <div className="rounded-3xl bg-white/80 backdrop-blur-xl p-6 shadow-2xl shadow-blue-100 dark:bg-slate-900/80 dark:shadow-none sm:p-10 border border-white/20 dark:border-slate-800">
          
          {error && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 rounded-2xl border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-200">
              <div className="flex items-center gap-2 font-bold">
                <span className="text-lg">⚠️</span>
                <span>Wait a second...</span>
              </div>
              <p className="mt-2 ml-7 opacity-90">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 animate-in fade-in slide-in-from-top-2 rounded-2xl border-l-4 border-green-500 bg-green-50 p-4 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-200">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Excellent!</span>
              </div>
              <p className="mt-2 ml-7 opacity-90">{success}</p>
            </div>
          )}

          {/* STEP 1: ROLE SELECTION */}
          {currentStep === 'role' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">How will you use PhD NexusCare?</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Choose the identity that best describes you to tailor your experience.</p>
              
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'patient', title: 'Patient', desc: 'Manage your health records & book appointments', icon: HeartPulse, color: 'blue' },
                  { id: 'doctor', title: 'Doctor', desc: 'Provide care, manage slots & track patients', icon: Stethoscope, color: 'indigo' },
                  { id: 'provider', title: 'Organization', desc: 'Offer diagnostic & hospital services', icon: Hospital, color: 'violet' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setRole(r.id as any); nextStep(); }}
                    className={`group relative flex items-center gap-6 rounded-2xl border-2 p-6 text-left transition-all duration-300 hover:shadow-xl ${
                      role === r.id
                        ? 'border-blue-500 bg-blue-50/50 ring-4 ring-blue-500/10 dark:bg-blue-900/20'
                        : 'border-gray-100 bg-white hover:border-blue-200 dark:border-slate-800 dark:bg-slate-800/50'
                    }`}
                  >
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 ${
                      role === r.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500'
                    }`}>
                      <r.icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{r.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{r.desc}</p>
                    </div>
                    <ArrowRight className={`h-5 w-5 transition-transform duration-300 ${
                      role === r.id ? 'translate-x-0 text-blue-500 opacity-100' : '-translate-x-4 text-gray-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                    }`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: ACCOUNT SECURITY */}
          {currentStep === 'account' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Secure your account</h2>
                <p className="text-gray-500 dark:text-gray-400">Let's set up your credentials for {role} access.</p>
              </div>

              <div className="space-y-4">
                <div className="group">
                  <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="group">
                  <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 border-r border-gray-200 pr-2 dark:border-slate-700">
                      <span className="text-lg">🇧🇩</span>
                      <span className="text-xs font-bold text-gray-400">+88</span>
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-24 pr-4 text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                      placeholder="01712345678"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="group">
                    <label htmlFor="password" title="At least 8 characters" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                      <input
                        id="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label htmlFor="password_confirm" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                      Confirm <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                      <input
                        id="password_confirm"
                        type="password"
                        required
                        value={formData.password_confirm}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={prevStep} className="flex-1 rounded-xl border-2 border-gray-100 py-3 font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95 dark:border-slate-800 dark:text-gray-400 dark:hover:bg-slate-800">
                  Go Back
                </button>
                <button type="button" onClick={nextStep} className="flex-[2] rounded-xl bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 dark:shadow-none">
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROFESSIONAL PROFILE */}
          {currentStep === 'profile' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Complete your profile</h2>
                <p className="text-gray-500 dark:text-gray-400">Tell us more about yourself to finalize registration.</p>
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-4">
                {role !== 'provider' && (
                  <div className="group">
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-500" />
                      <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                )}

                {role === 'patient' && (
                  <div className="space-y-6 animate-in fade-in duration-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label htmlFor="dob" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
                        <input id="dob" type="date" value={formData.dob} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                      </div>
                      <div className="group">
                        <label htmlFor="gender" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                        <select id="gender" value={formData.gender} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                          <option value="">Select...</option>
                          <option value="M">Male</option>
                          <option value="F">Female</option>
                          <option value="O">Other</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="group">
                      <label htmlFor="blood_group" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Blood Group</label>
                      <select id="blood_group" value={formData.blood_group} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                        <option value="">Select...</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>

                    <div className="group">
                      <label htmlFor="emergency_contact" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                        Emergency Contact
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 border-r border-gray-200 pr-2 dark:border-slate-700">
                          <span className="text-lg">🇧🇩</span>
                          <span className="text-xs font-bold text-gray-400">+88</span>
                        </div>
                        <input
                          id="emergency_contact"
                          type="tel"
                          value={formData.emergency_contact}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-24 pr-4 text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                          placeholder="01712345678"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Current Address</label>
                      <LocationPicker onLocationSelect={handleLocationSelect} defaultAddress={formData.address} />
                    </div>
                  </div>
                )}

                {role === 'doctor' && (
                  <div className="space-y-6 animate-in fade-in duration-700">
                    <div className="group">
                      <label htmlFor="specialty" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                        Primary Specialty <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500" />
                        <select id="specialty" required value={formData.specialty} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                          <option value="">Select Specialty...</option>
                          {['Cardiology', 'Neurology', 'Pulmonology', 'Gastroenterology', 'Dermatology', 'Psychiatry', 'General Physician'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="group">
                      <label htmlFor="qualifications" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Academic Qualifications</label>
                      <textarea id="qualifications" value={formData.qualifications} onChange={handleInputChange} rows={2} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="MD, MBBS, etc." />
                    </div>
                    <div className="group">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Chamber/Clinic Location</label>
                      <LocationPicker onLocationSelect={handleLocationSelect} defaultAddress={formData.location} />
                    </div>
                  </div>
                )}

                {role === 'provider' && (
                  <div className="space-y-6 animate-in fade-in duration-700">
                    <div className="group">
                      <label htmlFor="organization_name" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Organization Name <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input id="organization_name" type="text" required value={formData.organization_name} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-11 pr-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Dhaka Medical College" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label htmlFor="organization_type" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                        <select id="organization_type" value={formData.organization_type} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                          <option value="hospital">Hospital</option>
                          <option value="diagnostic_center">Diagnostic</option>
                          <option value="clinic">Clinic</option>
                        </select>
                      </div>
                      <div className="group">
                        <label htmlFor="contact_person" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contact Person <span className="text-red-500">*</span></label>
                        <input id="contact_person" type="text" required value={formData.contact_person} onChange={handleInputChange} className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 outline-none focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Manager Name" />
                      </div>
                    </div>
                    <div className="group">
                      <label htmlFor="provider_phone" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors group-focus-within:text-blue-600">
                        Organization Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center space-x-1 border-r border-gray-200 pr-2 dark:border-slate-700">
                          <span className="text-lg">🇧🇩</span>
                          <span className="text-xs font-bold text-gray-400">+88</span>
                        </div>
                        <input
                          id="provider_phone"
                          type="tel"
                          required
                          value={formData.provider_phone}
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-24 pr-4 text-gray-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                          placeholder="01712345678"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label htmlFor="logo-upload" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Organization Logo</label>
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-6 transition-all hover:border-blue-500 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-900">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          <Upload className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{organizationLogo ? organizationLogo.name : 'Click to upload logo'}</span>
                        <input id="logo-upload" type="file" accept="image/*" className="sr-only" onChange={(e) => setOrganizationLogo(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Organization Address <span className="text-red-500">*</span></label>
                      <LocationPicker onLocationSelect={handleLocationSelect} defaultAddress={formData.address} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button type="button" onClick={prevStep} className="flex-1 rounded-xl border-2 border-gray-100 py-3 font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95 dark:border-slate-800 dark:text-gray-400 dark:hover:bg-slate-800">
                  Go Back
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="flex-[2] relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-bold text-white shadow-xl shadow-blue-200 transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 dark:shadow-none"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <UserPlus className="h-5 w-5" />
                        Create Account
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Login Link */}
        <div className="mt-8 text-center animate-in fade-in duration-1000">
          <p className="text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-blue-600 hover:text-blue-500 underline-offset-4 hover:underline">
              Sign in now
            </Link>
          </p>
        </div>
      </form>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
