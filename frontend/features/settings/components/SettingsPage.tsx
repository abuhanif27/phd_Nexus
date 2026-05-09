'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Bell,
  Shield,
  Lock,
  Globe,
  Moon,
  Sun,
  Monitor,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Smartphone,
  Key,
  Activity,
  Heart,
  FileText,
  Trash2,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
  Link2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/features/auth/store';
import { authApi } from '@/features/auth/api';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils/cn';
import { ShareLinksManager } from './ShareLinksManager';
import { getSettings, updateSettings, updateProfile, changePassword, toggle2FA } from '../api';

export function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const refreshUser = async () => {
    try {
      const refreshedUser = await authApi.getCurrentUser();
      updateUser(refreshedUser);
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  // Settings state
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: getSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update settings.' });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      refreshUser();
      toast({ title: 'Profile updated', description: 'Your profile has been successfully updated.' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast({ title: 'Password changed', description: 'Your password has been successfully updated.' });
      // clear fields (could use refs or state for this)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.new_password?.[0] || 'Failed to change password.';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    },
  });

  const toggle2FAMutation = useMutation({
    mutationFn: toggle2FA,
    onSuccess: (data) => {
      refreshUser();
      toast({ title: '2FA Updated', description: data.message });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update 2FA status.' });
    },
  });

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    updateProfileMutation.mutate(data);
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    changePasswordMutation.mutate(data);
  };

  const handleSettingChange = (key: string, value: any) => {
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (isLoadingSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const s = settings || {} as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                Settings
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your account preferences and application settings
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList
            className={`grid w-full grid-cols-2 gap-4 bg-white p-2 dark:bg-gray-800 ${isPatient ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}
          >
            <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              <Bell className="h-4 w-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              <Shield className="h-4 w-4" /> Security
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              <Lock className="h-4 w-4" /> Privacy
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
              <Monitor className="h-4 w-4" /> Preferences
            </TabsTrigger>
            {isPatient && (
              <TabsTrigger value="share-links" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                <Link2 className="h-4 w-4" /> Share Links
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" /> Personal Information
                </CardTitle>
                <CardDescription>Update your personal details and contact information</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Profile Photo Placeholder */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white">
                        {user?.email?.charAt(0).toUpperCase()}
                      </div>
                      <Button type="button" size="sm" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0">
                        <Activity className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Profile Photo</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">PNG, JPG up to 5MB</p>
                      <div className="mt-2 flex gap-2">
                        <Button type="button" size="sm" variant="outline">Upload New</Button>
                        <Button type="button" size="sm" variant="ghost" className="text-red-600">Remove</Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Full Name
                      </Label>
                      <Input id="name" name="name" defaultValue={isPatient ? user?.patient_profile?.name : isDoctor ? user?.doctor_profile?.name : ''} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email Address
                      </Label>
                      <Input id="email" name="email" type="email" defaultValue={user?.email} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Phone Number
                      </Label>
                      <Input id="phone" name="phone" type="tel" defaultValue={user?.phone || ''} />
                    </div>

                    {isPatient && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="dob" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Date of Birth
                          </Label>
                          <Input id="dob" name="dob" type="date" defaultValue={user?.patient_profile?.dob ? new Date(user.patient_profile.dob).toISOString().split('T')[0] : ''} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="blood_group" className="flex items-center gap-2">
                            <Heart className="h-4 w-4" /> Blood Group
                          </Label>
                          <Input id="blood_group" name="blood_group" defaultValue={user?.patient_profile?.blood_group || ''} placeholder="A+" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="emergency_contact" className="flex items-center gap-2">
                            <Phone className="h-4 w-4" /> Emergency Contact
                          </Label>
                          <Input id="emergency_contact" name="emergency_contact" defaultValue={user?.patient_profile?.emergency_contact || ''} />
                        </div>
                      </>
                    )}

                    {isDoctor && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="specialty" className="flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Specialty
                          </Label>
                          <Input id="specialty" name="specialty" defaultValue={user?.doctor_profile?.specialty || ''} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="qualifications" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Qualifications
                          </Label>
                          <Input id="qualifications" name="qualifications" defaultValue={user?.doctor_profile?.qualifications || ''} />
                        </div>
                      </>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Address / Location
                      </Label>
                      <Input id="address" name={isDoctor ? 'location' : 'address'} defaultValue={isPatient ? user?.patient_profile?.address : isDoctor ? user?.doctor_profile?.location : ''} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="submit" disabled={updateProfileMutation.isPending} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                      {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" /> Notification Preferences
                </CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Channels</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Email</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Receive via email</p>
                        </div>
                      </div>
                      <Switch checked={s.email_notifications} onCheckedChange={(v) => handleSettingChange('email_notifications', v)} disabled={updateSettingsMutation.isPending} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Push</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Receive on device</p>
                        </div>
                      </div>
                      <Switch checked={s.push_notifications} onCheckedChange={(v) => handleSettingChange('push_notifications', v)} disabled={updateSettingsMutation.isPending} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">SMS</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Important alerts via SMS</p>
                        </div>
                      </div>
                      <Switch checked={s.sms_notifications} onCheckedChange={(v) => handleSettingChange('sms_notifications', v)} disabled={updateSettingsMutation.isPending} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Appointment Reminders</p>
                      </div>
                      <Switch checked={s.appointment_reminders} onCheckedChange={(v) => handleSettingChange('appointment_reminders', v)} disabled={updateSettingsMutation.isPending} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Medication Reminders</p>
                      </div>
                      <Switch checked={s.medication_reminders} onCheckedChange={(v) => handleSettingChange('medication_reminders', v)} disabled={updateSettingsMutation.isPending} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Health Alerts</p>
                      </div>
                      <Switch checked={s.health_alerts} onCheckedChange={(v) => handleSettingChange('health_alerts', v)} disabled={updateSettingsMutation.isPending} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Newsletters</p>
                      </div>
                      <Switch checked={s.newsletters} onCheckedChange={(v) => handleSettingChange('newsletters', v)} disabled={updateSettingsMutation.isPending} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" /> Security Settings
                </CardTitle>
                <CardDescription>Manage your password and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input id="currentPassword" name="current_password" type={showPassword ? 'text' : 'password'} required />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input id="newPassword" name="new_password" type={showNewPassword ? 'text' : 'password'} required />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" name="confirm_password" type="password" required />
                    </div>
                    <Button type="submit" variant="outline" className="w-full" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                      Update Password
                    </Button>
                  </div>
                </form>

                <div className="space-y-4 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-600 p-2"><Shield className="h-5 w-5 text-white" /></div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user?.twofa_enabled ? 'Currently enabled' : 'Add an extra layer of security'}</p>
                      </div>
                    </div>
                    <Badge className={user?.twofa_enabled ? 'bg-green-600' : 'bg-gray-400'}>{user?.twofa_enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                  <Button variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-100" onClick={() => toggle2FAMutation.mutate()} disabled={toggle2FAMutation.isPending}>
                    {toggle2FAMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : user?.twofa_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" /> Privacy & Data
                </CardTitle>
                <CardDescription>Control your data and privacy preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Share Data for Medical Research</p>
                    </div>
                    <Switch checked={s.share_data_research} onCheckedChange={(v) => handleSettingChange('share_data_research', v)} disabled={updateSettingsMutation.isPending} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">AI Health Analysis</p>
                    </div>
                    <Switch checked={s.allow_ai_analysis} onCheckedChange={(v) => handleSettingChange('allow_ai_analysis', v)} disabled={updateSettingsMutation.isPending} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Data Synchronization</p>
                    </div>
                    <Switch checked={s.data_sync_enabled} onCheckedChange={(v) => handleSettingChange('data_sync_enabled', v)} disabled={updateSettingsMutation.isPending} />
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-900 dark:text-red-400">Danger Zone</h3>
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full border-red-600 text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-600" /> App Preferences
                </CardTitle>
                <CardDescription>Customize your application experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    {['light', 'dark', 'system'].map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => handleSettingChange('theme', themeOption)}
                        className={cn(
                          'flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
                          s.theme === themeOption ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 hover:border-gray-300'
                        )}
                        disabled={updateSettingsMutation.isPending}
                      >
                        {themeOption === 'light' ? <Sun className="h-8 w-8 text-yellow-600" /> : themeOption === 'dark' ? <Moon className="h-8 w-8 text-indigo-600" /> : <Monitor className="h-8 w-8 text-gray-600" />}
                        <div className="text-center">
                          <p className="font-medium capitalize">{themeOption}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Language & Region</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Language
                      </Label>
                      <Input id="language" value={s.language || 'en-US'} onChange={(e) => handleSettingChange('language', e.target.value)} disabled={updateSettingsMutation.isPending} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Timezone
                      </Label>
                      <Input id="timezone" value={s.timezone || 'UTC'} onChange={(e) => handleSettingChange('timezone', e.target.value)} disabled={updateSettingsMutation.isPending} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Share Links Management */}
          {isPatient && (
            <TabsContent value="share-links" className="space-y-6">
              <ShareLinksManager />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
