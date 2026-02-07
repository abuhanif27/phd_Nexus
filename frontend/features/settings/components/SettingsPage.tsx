'use client';

import { useState } from 'react';
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
  Database,
  Activity,
  Heart,
  FileText,
  Download,
  Trash2,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/features/auth/store';
import { cn } from '@/lib/utils/cn';
import { ShareLinksManager } from './ShareLinksManager';

export function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings state
  const [theme, setTheme] = useState('system');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    appointments: true,
    reminders: true,
    healthAlerts: true,
    newsletters: false,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    shareDataForResearch: false,
    allowAIAnalysis: true,
    dataSyncEnabled: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your account preferences and application settings
              </p>
            </div>
            {saved && (
              <Badge className="bg-green-600 px-4 py-2 text-white">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Settings Saved
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-2 gap-4 bg-white p-2 dark:bg-gray-800 ${isPatient ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
            <TabsTrigger
              value="profile"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Lock className="h-4 w-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Monitor className="h-4 w-4" />
              Preferences
            </TabsTrigger>
            {isPatient && (
              <TabsTrigger
                value="share-links"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Link2 className="h-4 w-4" />
                Share Links
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Photo */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Profile Photo</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">PNG, JPG up to 5MB</p>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline">
                        Upload New
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600">
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      defaultValue={
                        isPatient
                          ? user?.patient_profile?.name
                          : isDoctor
                            ? user?.doctor_profile?.name
                            : user?.email
                      }
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={user?.email}
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      defaultValue={user?.phone || ''}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  {isPatient && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="dob" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Date of Birth
                        </Label>
                        <Input
                          id="dob"
                          type="date"
                          defaultValue={user?.patient_profile?.dob || ''}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bloodGroup" className="flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Blood Group
                        </Label>
                        <Input
                          id="bloodGroup"
                          defaultValue={user?.patient_profile?.blood_group || ''}
                          placeholder="A+"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emergency" className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Emergency Contact
                        </Label>
                        <Input
                          id="emergency"
                          defaultValue={user?.patient_profile?.emergency_contact || ''}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </>
                  )}

                  {isDoctor && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="specialty" className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Specialty
                        </Label>
                        <Input
                          id="specialty"
                          defaultValue={user?.doctor_profile?.specialty || ''}
                          placeholder="Cardiology"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="qualifications" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Qualifications
                        </Label>
                        <Input
                          id="qualifications"
                          defaultValue={user?.doctor_profile?.qualifications || ''}
                          placeholder="MD, MBBS"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </Label>
                    <Input
                      id="address"
                      defaultValue={
                        isPatient
                          ? user?.patient_profile?.address
                          : isDoctor
                            ? user?.doctor_profile?.location
                            : ''
                      }
                      placeholder="Enter your full address"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-600" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications and updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Channels */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notification Channels
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Email Notifications
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive notifications via email
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={(checked: boolean) =>
                          setNotifications({ ...notifications, email: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Push Notifications
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive push notifications on your device
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={(checked: boolean) =>
                          setNotifications({ ...notifications, push: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            SMS Notifications
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive important alerts via SMS
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.sms}
                        onCheckedChange={(checked: boolean) =>
                          setNotifications({ ...notifications, sms: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Types */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notification Types
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Appointment Reminders
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get reminded about upcoming appointments
                        </p>
                      </div>
                      <Switch
                        checked={notifications.appointments}
                        onCheckedChange={(checked: boolean) =>
                          setNotifications({ ...notifications, appointments: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Medication Reminders
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Reminders to take your medications
                        </p>
                      </div>
                      <Switch
                        checked={notifications.reminders}
                        onCheckedChange={(checked: boolean) =>
                          setNotifications({ ...notifications, reminders: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Health Alerts</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Critical health updates and alerts
                        </p>
                      </div>
                      <Switch
                        checked={notifications.healthAlerts}
                        onCheckedChange={(checked: boolean) =>
                          setNotifications({ ...notifications, healthAlerts: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Newsletter & Updates
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Latest health tips and platform updates
                        </p>
                      </div>
                      <Switch
                        checked={notifications.newsletters}
                        onCheckedChange={(checked: boolean) =>
                          setNotifications({ ...notifications, newsletters: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Security Settings
                </CardTitle>
                <CardDescription>Manage your password and security options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password Change */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                      />
                    </div>

                    <Button variant="outline" className="w-full">
                      <Key className="mr-2 h-4 w-4" />
                      Update Password
                    </Button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="space-y-4 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-600 p-2">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Two-Factor Authentication
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {user?.twofa_enabled
                            ? 'Currently enabled'
                            : 'Add an extra layer of security'}
                        </p>
                      </div>
                    </div>
                    <Badge className={user?.twofa_enabled ? 'bg-green-600' : 'bg-gray-400'}>
                      {user?.twofa_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-green-600 text-green-700 hover:bg-green-100"
                  >
                    {user?.twofa_enabled ? 'Manage 2FA' : 'Enable 2FA'}
                  </Button>
                </div>

                {/* Active Sessions */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Current Session
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Linux • Chrome • Active now
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-600">Active</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out All Other Sessions
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
                  <Lock className="h-5 w-5 text-blue-600" />
                  Privacy & Data
                </CardTitle>
                <CardDescription>Control your data and privacy preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Share Data for Medical Research
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Help improve healthcare through anonymized data sharing
                      </p>
                    </div>
                    <Switch
                      checked={privacy.shareDataForResearch}
                      onCheckedChange={(checked: boolean) =>
                        setPrivacy({ ...privacy, shareDataForResearch: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        AI Health Analysis
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Allow AI to analyze your health data for insights
                      </p>
                    </div>
                    <Switch
                      checked={privacy.allowAIAnalysis}
                      onCheckedChange={(checked: boolean) =>
                        setPrivacy({ ...privacy, allowAIAnalysis: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Data Synchronization
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Sync your data across devices
                      </p>
                    </div>
                    <Switch
                      checked={privacy.dataSyncEnabled}
                      onCheckedChange={(checked: boolean) =>
                        setPrivacy({ ...privacy, dataSyncEnabled: checked })
                      }
                    />
                  </div>
                </div>

                {/* Data Management */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Data Management</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" className="justify-start">
                      <Download className="mr-2 h-4 w-4" />
                      Download My Data
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <Database className="mr-2 h-4 w-4" />
                      View Data Usage
                    </Button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 rounded-lg border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-900 dark:text-red-400">Danger Zone</h3>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    These actions are permanent and cannot be undone
                  </p>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full border-red-600 text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Health Records
                    </Button>
                    <Button variant="outline" className="w-full border-red-600 text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Privacy Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  App Preferences
                </CardTitle>
                <CardDescription>Customize your application experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        'flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
                        theme === 'light'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Sun className="h-8 w-8 text-yellow-600" />
                      <div className="text-center">
                        <p className="font-medium">Light</p>
                        <p className="text-xs text-gray-600">Bright and clear</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        'flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
                        theme === 'dark'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Moon className="h-8 w-8 text-indigo-600" />
                      <div className="text-center">
                        <p className="font-medium">Dark</p>
                        <p className="text-xs text-gray-600">Easy on the eyes</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setTheme('system')}
                      className={cn(
                        'flex flex-col items-center gap-3 rounded-lg border-2 p-4 transition-all',
                        theme === 'system'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Monitor className="h-8 w-8 text-gray-600" />
                      <div className="text-center">
                        <p className="font-medium">System</p>
                        <p className="text-xs text-gray-600">Auto switch</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Language & Region</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="language" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Language
                      </Label>
                      <Input id="language" defaultValue="English (US)" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Timezone
                      </Label>
                      <Input id="timezone" defaultValue="America/New_York (EST)" />
                    </div>
                  </div>
                </div>

                {/* System Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    System Information
                  </h3>
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">App Version</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">1.0.0</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Backend API</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">
                          Django REST v3.14
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Database</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">PostgreSQL 15</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600 dark:text-gray-400">Last Sync</dt>
                        <dd className="font-medium text-gray-900 dark:text-white">2 minutes ago</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Share Links Management (Patient Only) */}
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
