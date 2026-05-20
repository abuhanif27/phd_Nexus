'use client';

import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Bell,
  Shield,
  Lock,
  Moon,
  Sun,
  Monitor,
  Save,
  Loader2,
  Link2,
  QrCode,
  Key,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/features/auth/store';
import { authApi } from '@/features/auth/api';
import { useToast } from '@/components/ui/use-toast';
import { ShareLinksManager } from './ShareLinksManager';
import { 
  getSettings, updateSettings, updateProfile, changePassword, 
  requestEmailChange, verifyEmailChange, setup2FA, send2FAEmail, toggle2FA 
} from '../api';

export function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  
  // States
  const [isEmailChanging, setIsEmailChangeRequested] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [is2FASetup, setIs2FASetup] = useState(false);
  const [twofaSetupData, setTwoFASetupData] = useState<{ secret: string; provisioning_uri: string } | null>(null);
  const [twofaMethod, setTwoFAMethod] = useState<'email' | 'totp'>('email');

  const refreshUser = async () => {
    try {
      const refreshedUser = await authApi.getCurrentUser();
      updateUser(refreshedUser);
    } catch (e) { console.error(e); }
  };

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: getSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({ title: 'Settings saved' });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => { refreshUser(); toast({ title: 'Profile updated' }); },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast({ title: 'Password updated' });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err?.response?.data?.error || 'Failed' });
    },
  });

  const emailChangeRequestMutation = useMutation({
    mutationFn: requestEmailChange,
    onSuccess: (_, email) => {
      setIsEmailChangeRequested(true);
      setPendingEmail(email);
      toast({ title: 'Verification sent', description: `Check ${email} for the code.` });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err?.response?.data?.error || 'Failed' }),
  });

  const emailVerifyMutation = useMutation({
    mutationFn: verifyEmailChange,
    onSuccess: (data) => {
      setIsEmailChangeRequested(false);
      refreshUser();
      toast({ title: 'Email updated', description: `Your email is now ${data.email}` });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err?.response?.data?.error || 'Invalid code' }),
  });

  const setup2FAMutation = useMutation({
    mutationFn: setup2FA,
    onSuccess: (data) => { setTwoFASetupData(data); setIs2FASetup(true); },
  });

  const toggle2FAMutation = useMutation({
    mutationFn: toggle2FA,
    onSuccess: (data) => {
      setIs2FASetup(false);
      setTwoFASetupData(null);
      refreshUser();
      toast({ title: data.message });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err?.response?.data?.error || 'Failed' }),
  });

  const handleProfileSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    updateProfileMutation.mutate(data);
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    changePasswordMutation.mutate(data);
  };

  if (isLoadingSettings) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const s = settings || {} as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Account preferences and security</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 gap-2 bg-white p-1">
            <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" /> Alerts</TabsTrigger>
            <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4" /> Security</TabsTrigger>
            <TabsTrigger value="privacy"><Lock className="mr-2 h-4 w-4" /> Privacy</TabsTrigger>
            <TabsTrigger value="preferences"><Monitor className="mr-2 h-4 w-4" /> UI</TabsTrigger>
            {user?.role === 'patient' && <TabsTrigger value="share-links"><Link2 className="mr-2 h-4 w-4" /> Links</TabsTrigger>}
          </TabsList>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 border-b pb-6">
                  <Label>Email Address</Label>
                  {!isEmailChanging ? (
                    <div className="flex gap-2">
                      <Input value={user?.email || ''} readOnly className="bg-gray-50" />
                      <Button variant="outline" onClick={() => {
                        const email = prompt("Enter new email:");
                        if (email) emailChangeRequestMutation.mutate(email);
                      }}>Change</Button>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg bg-blue-50 p-4">
                      <p className="text-sm font-medium">Verify change to {pendingEmail}</p>
                      <div className="flex gap-2">
                        <Input id="email_otp" placeholder="Enter 6-digit code" maxLength={6} />
                        <Button onClick={() => {
                          const code = (document.getElementById('email_otp') as HTMLInputElement).value;
                          emailVerifyMutation.mutate(code);
                        }}>Verify</Button>
                        <Button variant="ghost" onClick={() => setIsEmailChangeRequested(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleProfileSubmit} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" defaultValue={user?.patient_profile?.name || user?.doctor_profile?.name || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={user?.phone || ''} />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" disabled={updateProfileMutation.isPending} className="bg-blue-600 text-white">
                      {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Security & Access</CardTitle></CardHeader>
              <CardContent className="space-y-8">
                <div className="rounded-xl border-2 border-blue-100 bg-white p-6 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-600 rounded-full text-white"><Shield className="h-6 w-6" /></div>
                      <div>
                        <h3 className="text-lg font-bold">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Secure your account with an extra layer</p>
                      </div>
                    </div>
                    <Badge className={user?.twofa_enabled ? 'bg-green-600' : 'bg-gray-400'}>
                      {user?.twofa_enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  {!user?.twofa_enabled ? (
                    !is2FASetup ? (
                      <div className="flex gap-2">
                        <Button className="flex-1" variant="outline" onClick={() => {
                          setTwoFAMethod('email');
                          send2FAEmail().then(() => {
                            setIs2FASetup(true);
                            toast({ title: 'Code sent to email' });
                          });
                        }}>Use Email OTP</Button>
                        <Button className="flex-1 bg-blue-600 text-white" onClick={() => {
                          setTwoFAMethod('totp');
                          setup2FAMutation.mutate();
                        }}>Use Authenticator App</Button>
                      </div>
                    ) : (
                      <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                        {twofaMethod === 'totp' && twofaSetupData && (
                          <div className="space-y-2 text-center">
                            <QrCode className="h-24 w-24 mx-auto text-gray-400" />
                            <p className="text-xs font-mono break-all bg-white p-2 border">{twofaSetupData.secret}</p>
                            <p className="text-sm text-gray-500">Scan QR or enter secret in Google Authenticator</p>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Enter Code to Enable</Label>
                          <div className="flex gap-2">
                            <Input id="2fa_otp" placeholder="6-digit code" maxLength={6} />
                            <Button onClick={() => {
                              const code = (document.getElementById('2fa_otp') as HTMLInputElement).value;
                              toggle2FAMutation.mutate({ action: 'enable', method: twofaMethod, code });
                            }}>Enable 2FA</Button>
                            <Button variant="ghost" onClick={() => setIs2FASetup(false)}>Cancel</Button>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">2FA is enabled via {user.twofa_method}</p>
                      <Button variant="destructive" onClick={() => {
                        const code = prompt("Enter code to confirm disable:");
                        if (code) toggle2FAMutation.mutate({ action: 'disable', code });
                      }}>Disable 2FA</Button>
                    </div>
                  )}
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4 border-t pt-8">
                  <h3 className="font-bold">Change Password</h3>
                  <div className="grid gap-4">
                    <Input name="current_password" type="password" placeholder="Current Password" required />
                    <Input name="new_password" type="password" placeholder="New Password" required />
                    <Input name="confirm_password" type="password" placeholder="Confirm New Password" required />
                  </div>
                  <Button type="submit" variant="outline" className="w-full" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
                    Update Password
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Simple Settings Mapping */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {['email_notifications', 'push_notifications', 'appointment_reminders', 'medication_reminders'].map(key => (
                  <div key={key} className="flex items-center justify-between p-2 border-b">
                    <Label className="capitalize">{key.replace('_', ' ')}</Label>
                    <Switch checked={s[key]} onCheckedChange={(v) => updateSettingsMutation.mutate({ [key]: v })} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences">
            <Card>
              <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                {['light', 'dark', 'system'].map(mode => (
                  <Button key={mode} variant={s.theme === mode ? 'default' : 'outline'} className="capitalize" onClick={() => updateSettingsMutation.mutate({ theme: mode })}>
                    {mode === 'light' ? <Sun className="mr-2" /> : mode === 'dark' ? <Moon className="mr-2" /> : <Monitor className="mr-2" />}
                    {mode}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === 'patient' && <TabsContent value="share-links"><ShareLinksManager /></TabsContent>}
        </Tabs>
      </div>
    </div>
  );
}
