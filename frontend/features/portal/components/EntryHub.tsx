'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  HeartPulse,
  PlusCircle,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePortalStore } from '@/store/usePortalStore';
import type { PortalRole } from '@/types/portal';

const roleCards: Array<{
  role: PortalRole;
  label: string;
  description: string;
  icon: typeof UserRound;
}> = [
  {
    role: 'patient',
    label: 'Patient',
    description: 'Records, medicine alarms, chat triage, visit code.',
    icon: UserRound,
  },
  {
    role: 'doctor',
    label: 'Doctor',
    description: 'Patient code lookup, AI overview, drag-drop prescription.',
    icon: Stethoscope,
  },
  {
    role: 'hospital',
    label: 'Hospital',
    description: 'Spreadsheet-like operations board with live calculations.',
    icon: Building2,
  },
];

export function EntryHub() {
  const router = useRouter();
  const profiles = usePortalStore((state) => state.profiles);
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const registerProfile = usePortalStore((state) => state.registerProfile);
  const setActiveProfile = usePortalStore((state) => state.setActiveProfile);
  const [role, setRole] = useState<PortalRole>('patient');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [error, setError] = useState('');

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [activeProfileId, profiles]
  );

  const handleCreate = () => {
    if (!name.trim()) {
      setError('Name is required for direct entry.');
      return;
    }

    if (role === 'doctor' && !specialty.trim()) {
      setError('Doctor specialty is required.');
      return;
    }

    if (role === 'hospital' && !hospitalName.trim()) {
      setError('Hospital name is required.');
      return;
    }

    const profile = registerProfile({
      role,
      name,
      phone,
      email,
      specialty,
      hospitalName,
    });

    setError('');
    setName('');
    setPhone('');
    setEmail('');
    setSpecialty('');
    setHospitalName('');
    router.push('/dashboard');
    setActiveProfile(profile.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Badge className="border border-white/20 bg-white/10 px-4 py-1 text-white hover:bg-white/10">
            Direct entry mode • no login screen
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Role-first entry for patient, doctor, and hospital workspaces
            </h1>
            <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
              Start from one page, choose who is entering, and move directly into the correct
              workspace like a phone gallery experience.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {roleCards.map(({ role: itemRole, label, description, icon: Icon }) => (
              <button
                key={itemRole}
                type="button"
                onClick={() => setRole(itemRole)}
                className={`rounded-2xl border p-5 text-left transition ${
                  role === itemRole
                    ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-900/40'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <Icon className="mb-3 h-6 w-6 text-cyan-300" />
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm text-slate-300">{description}</p>
              </button>
            ))}
          </div>

          <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-cyan-300" /> Create device profile
              </CardTitle>
              <CardDescription className="text-slate-300">
                One-time setup for this browser. After that, entry is instant.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="entry-name" className="text-slate-100">
                  Name
                </Label>
                <Input
                  id="entry-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter a full name"
                  className="border-white/10 bg-slate-950/70 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-phone" className="text-slate-100">
                  Phone
                </Label>
                <Input
                  id="entry-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Optional"
                  className="border-white/10 bg-slate-950/70 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="entry-email" className="text-slate-100">
                  Email
                </Label>
                <Input
                  id="entry-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Optional"
                  className="border-white/10 bg-slate-950/70 text-white"
                />
              </div>
              {role === 'doctor' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="entry-specialty" className="text-slate-100">
                    Specialty
                  </Label>
                  <Input
                    id="entry-specialty"
                    value={specialty}
                    onChange={(event) => setSpecialty(event.target.value)}
                    placeholder="Cardiology, ENT, Medicine..."
                    className="border-white/10 bg-slate-950/70 text-white"
                  />
                </div>
              )}
              {role === 'hospital' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="entry-hospital" className="text-slate-100">
                    Hospital name
                  </Label>
                  <Input
                    id="entry-hospital"
                    value={hospitalName}
                    onChange={(event) => setHospitalName(event.target.value)}
                    placeholder="Nexus General Hospital"
                    className="border-white/10 bg-slate-950/70 text-white"
                  />
                </div>
              )}
              {error ? <p className="text-sm text-rose-300 md:col-span-2">{error}</p> : null}
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button onClick={handleCreate} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                  Create and enter <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-sm text-slate-300">
                  Current mode: <span className="font-medium text-white capitalize">{role}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-emerald-300" /> Saved device profiles
              </CardTitle>
              <CardDescription className="text-slate-300">
                Tap once to enter instantly. No password flow is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm text-slate-300">
                  No profile created yet. Create one to unlock the 4 new workspaces.
                </div>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      setActiveProfile(profile.id);
                      router.push('/dashboard');
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      activeProfile?.id === profile.id
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-white/10 bg-slate-950/40 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{profile.name}</p>
                        <p className="text-sm text-slate-300">
                          {profile.role === 'doctor'
                            ? profile.specialty || 'Doctor workspace'
                            : profile.role === 'hospital'
                              ? profile.hospitalName || 'Hospital workspace'
                              : 'Patient workspace'}
                        </p>
                      </div>
                      <Badge className="bg-white/10 text-white capitalize">{profile.role}</Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-300" /> What is included
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>• Patient page with messenger-style records, medicine alarm UI, and visit code.</p>
              <p>• Doctor page with patient code lookup, AI summary, and drag-drop prescription.</p>
              <p>• Hospital page with spreadsheet input and automatic KPI calculation.</p>
              <p>• Profile switching from the same device without a separate login step.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
