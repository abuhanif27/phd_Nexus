'use client';

import { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Heart,
  Activity,
  Droplet,
  Award,
  Clock,
  Shield,
  Edit,
  Camera,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Pill,
  FileText,
  TrendingUp,
  Briefcase,
  GraduationCap,
  Star,
  Users,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/features/auth/store';
import { useCurrentUser } from '@/features/auth/hooks';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

export function ProfilePage() {
  // Prefer fresh data from /api/auth/me/ (includes doctor_profile / patient_profile)
  // Fall back to the Zustand persisted store while the request is in-flight.
  const { user: storedUser } = useAuthStore();
  const { data: freshUser } = useCurrentUser();
  const user = freshUser ?? storedUser;
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  const handleSave = () => {
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  // Mock patient data
  const patientStats = {
    healthScore: 85,
    appointments: 12,
    medications: 3,
    lastCheckup: '2024-10-15',
  };

  // Mock doctor data
  const doctorStats = {
    rating: 4.8,
    patients: 156,
    consultations: 1240,
    specialization: user?.doctor_profile?.specialty || 'General Medicine',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header with Save Success */}
        {saved && (
          <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="font-semibold text-green-900 dark:text-green-400">
                Profile updated successfully!
              </p>
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50 dark:border-blue-800 dark:from-gray-800 dark:to-blue-950/30">
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-col items-center gap-8 md:flex-row">
              {/* Profile Picture */}
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-4xl font-bold text-white shadow-xl ring-4 ring-blue-200 dark:ring-blue-800 sm:h-32 sm:w-32 sm:text-5xl">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-white p-0 shadow-lg hover:bg-gray-50 sm:h-10 sm:w-10"
                >
                  <Camera className="h-5 w-5 text-gray-700" />
                </Button>
                {user?.twofa_enabled && (
                  <div className="absolute -right-2 -top-2 rounded-full bg-green-600 p-2 shadow-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="mb-2 flex flex-col items-center gap-3 md:flex-row md:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {isPatient
                        ? user?.patient_profile?.name
                        : isDoctor
                          ? user?.doctor_profile?.name
                          : user?.email}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                      <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        {user?.role === 'patient' ? '👤 Patient' : '👨‍⚕️ Doctor'}
                      </Badge>
                      {user?.is_active && (
                        <Badge className="bg-green-600 text-white">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      )}
                      {user?.twofa_enabled && (
                        <Badge className="bg-purple-600 text-white">
                          <Shield className="mr-1 h-3 w-3" />
                          2FA Enabled
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                      'bg-gradient-to-r from-blue-600 to-indigo-600',
                      isEditing && 'from-red-600 to-orange-600'
                    )}
                  >
                    {isEditing ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>

                {/* Quick Info */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 dark:bg-gray-800/60">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 dark:bg-gray-800/60">
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user?.phone || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/60 p-3 dark:bg-gray-800/60">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Member Since</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {isPatient && user?.patient_profile?.patient_code && (
                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/40 sm:col-span-2 lg:col-span-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="text-sm shadow-sm">
                          Patient Code
                        </Badge>
                        <p className="font-mono font-bold tracking-wider text-blue-900 dark:text-blue-100">
                          {user.patient_profile.patient_code}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 hover:bg-blue-200 dark:hover:bg-blue-800"
                        onClick={() => {
                          if (user?.patient_profile?.patient_code) {
                            navigator.clipboard.writeText(user.patient_profile.patient_code);
                            toast({
                              title: 'Copied!',
                              description: 'Patient code copied. Share this code with your doctor.',
                            });
                          }
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Details */}
          <div className="space-y-8 lg:col-span-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        defaultValue={
                          isPatient
                            ? user?.patient_profile?.name
                            : isDoctor
                              ? user?.doctor_profile?.name
                              : ''
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={user?.email} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" type="tel" defaultValue={user?.phone || ''} />
                    </div>
                    {isPatient && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="dob">Date of Birth</Label>
                          <Input
                            id="dob"
                            type="date"
                            defaultValue={user?.patient_profile?.dob || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Input id="gender" defaultValue={user?.patient_profile?.gender || ''} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="blood">Blood Group</Label>
                          <Input
                            id="blood"
                            defaultValue={user?.patient_profile?.blood_group || ''}
                          />
                        </div>
                      </>
                    )}
                    {isDoctor && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="specialty">Specialty</Label>
                          <Input
                            id="specialty"
                            defaultValue={user?.doctor_profile?.specialty || ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="qualifications">Qualifications</Label>
                          <Input
                            id="qualifications"
                            defaultValue={user?.doctor_profile?.qualifications || ''}
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        defaultValue={
                          isPatient
                            ? user?.patient_profile?.address
                            : isDoctor
                              ? user?.doctor_profile?.location
                              : ''
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <User className="mt-1 h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {isPatient
                            ? user?.patient_profile?.name
                            : isDoctor
                              ? user?.doctor_profile?.name
                              : 'Not set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <Mail className="mt-1 h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <Phone className="mt-1 h-5 w-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {user?.phone || 'Not provided'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4">
                      <MapPin className="mt-1 h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {isPatient
                            ? user?.patient_profile?.address
                            : isDoctor
                              ? user?.doctor_profile?.location
                              : 'Not provided'}
                        </p>
                      </div>
                    </div>
                    {isPatient && (
                      <>
                        <div className="flex items-start gap-3 rounded-lg border p-4">
                          <Calendar className="mt-1 h-5 w-5 text-indigo-600" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Date of Birth
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {user?.patient_profile?.dob
                                ? format(new Date(user.patient_profile.dob), 'MMM dd, yyyy')
                                : 'Not set'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-lg border p-4">
                          <Droplet className="mt-1 h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Blood Group</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {user?.patient_profile?.blood_group || 'Not set'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                    {isDoctor && (
                      <>
                        <div className="flex items-start gap-3 rounded-lg border p-4">
                          <Briefcase className="mt-1 h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Specialty</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {user?.doctor_profile?.specialty || 'Not set'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 rounded-lg border p-4">
                          <GraduationCap className="mt-1 h-5 w-5 text-purple-600" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Qualifications
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {user?.doctor_profile?.qualifications || 'Not set'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Info for Patients */}
            {isPatient && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-600" />
                    Health Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Emergency Contact
                          </p>
                          <p className="text-lg font-bold text-green-900 dark:text-green-400">
                            {user?.patient_profile?.emergency_contact || 'Not set'}
                          </p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">Gender</p>
                          <p className="text-lg font-bold text-blue-900 dark:text-blue-400">
                            {user?.patient_profile?.gender === 'M'
                              ? 'Male'
                              : user?.patient_profile?.gender === 'F'
                                ? 'Female'
                                : user?.patient_profile?.gender === 'O'
                                  ? 'Other'
                                  : 'Not specified'}
                          </p>
                        </div>
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Info for Doctors */}
            {isDoctor && user?.doctor_profile?.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Professional Bio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-gray-700 dark:text-gray-300">
                    {user.doctor_profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-8">
            {/* Stats Card */}
            {isPatient && (
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    Health Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:from-green-950/20 dark:to-emerald-950/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 dark:text-green-300">Health Score</p>
                        <p className="text-3xl font-bold text-green-900 dark:text-green-400">
                          {patientStats.healthScore}
                          <span className="text-lg">/100</span>
                        </p>
                      </div>
                      <TrendingUp className="h-10 w-10 text-green-600" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          Appointments
                        </span>
                      </div>
                      <Badge className="bg-blue-600 text-white">{patientStats.appointments}</Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Pill className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          Medications
                        </span>
                      </div>
                      <Badge className="bg-purple-600 text-white">{patientStats.medications}</Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          Last Checkup
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {format(new Date(patientStats.lastCheckup), 'MMM dd')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isDoctor && (
              <Card className="border-2 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    Professional Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-amber-50 p-4 dark:from-yellow-950/20 dark:to-amber-950/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">Rating</p>
                        <div className="flex items-center gap-2">
                          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-400">
                            {user?.doctor_profile?.rating || doctorStats.rating}
                          </p>
                          <Star className="h-6 w-6 fill-yellow-500 text-yellow-500" />
                        </div>
                      </div>
                      <Award className="h-10 w-10 text-yellow-600" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-gray-900 dark:text-white">Patients</span>
                      </div>
                      <Badge className="bg-blue-600 text-white">{doctorStats.patients}</Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          Consultations
                        </span>
                      </div>
                      <Badge className="bg-green-600 text-white">{doctorStats.consultations}</Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-gray-900 dark:text-white">Specialty</span>
                      </div>
                      <Badge className="bg-purple-600 text-white">
                        {doctorStats.specialization}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="border-2 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  View Appointments
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <FileText className="h-5 w-5 text-green-600" />
                  Medical Records
                </Button>
                <Button variant="outline" className="w-full justify-start gap-3">
                  <Heart className="h-5 w-5 text-red-600" />
                  Health Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
