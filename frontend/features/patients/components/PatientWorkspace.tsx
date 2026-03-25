'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  BellRing,
  Bot,
  Clock3,
  Copy,
  FileText,
  MessageSquare,
  Pill,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { usePortalStore } from '@/store/usePortalStore';
import type { PatientRecord } from '@/types/portal';

export function PatientWorkspace() {
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const profiles = usePortalStore((state) => state.profiles);
  const patientWorkspaces = usePortalStore((state) => state.patientWorkspaces);
  const createPatientVisitCode = usePortalStore((state) => state.createPatientVisitCode);
  const sendPatientChatMessage = usePortalStore((state) => state.sendPatientChatMessage);
  const updateReminder = usePortalStore((state) => state.updateReminder);
  const markReminderTriggered = usePortalStore((state) => state.markReminderTriggered);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [notificationsReady, setNotificationsReady] = useState(false);

  const profile = useMemo(
    () => profiles.find((item) => item.id === activeProfileId && item.role === 'patient') ?? null,
    [activeProfileId, profiles]
  );
  const workspace = profile ? patientWorkspaces[profile.id] : undefined;

  const selectedRecord = useMemo(
    () => workspace?.records.find((record) => record.id === selectedPanel) ?? null,
    [selectedPanel, workspace]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !profile || !workspace) {
      return;
    }

    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDayKey = `${now.toISOString().slice(0, 10)} ${currentTime}`;

      workspace.reminders.forEach((reminder) => {
        if (!reminder.enabled || reminder.time !== currentTime || reminder.lastTriggeredAt === currentDayKey) {
          return;
        }

        markReminderTriggered(profile.id, reminder.id, currentDayKey);
        toast({
          title: 'Medicine reminder',
          description: `${reminder.label} is scheduled for now.`,
        });

        if (notificationsReady && 'Notification' in window) {
          new Notification('Medicine reminder', {
            body: `${reminder.label} is scheduled for now.`,
          });
        }
      });
    };

    checkReminders();
    const timerId = window.setInterval(checkReminders, 30000);
    return () => window.clearInterval(timerId);
  }, [markReminderTriggered, notificationsReady, profile, workspace]);

  if (!profile || !workspace) {
    return null;
  }

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Browser notification unavailable',
        description: 'This browser does not support notification popups.',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    setNotificationsReady(granted);
    toast({
      title: granted ? 'Alerts enabled' : 'Permission denied',
      description: granted
        ? 'Medicine reminders will use browser notifications.'
        : 'The reminder board will still stay active inside the app.',
    });
  };

  const handleSendMessage = () => {
    sendPatientChatMessage(profile.id, message);
    setSelectedPanel('chat');
    setMessage('');
  };

  const handleGenerateCode = async () => {
    const visitCode = createPatientVisitCode(profile.id);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(visitCode.code);
    }
    toast({
      title: 'Doctor visit code ready',
      description: `${visitCode.code} copied for the next visit.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patient smart workspace</h1>
          <p className="text-muted-foreground">
            Records, running prescription, specialist chat, and reminder alarms in one page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            {workspace.records.length} stored records
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            {workspace.reminders.filter((item) => item.enabled).length} active alarms
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_360px]">
        <div className="space-y-6">
          {selectedPanel === 'chat' ? (
            <Card className="border-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" /> Specialist assistant chat
                </CardTitle>
                <CardDescription>
                  Write symptoms and the assistant will propose the next specialist.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-4">
                  {workspace.chatMessages.map((chat) => (
                    <div
                      key={chat.id}
                      className={`rounded-2xl p-4 ${
                        chat.sender === 'user'
                          ? 'ml-auto max-w-[80%] bg-blue-600 text-white'
                          : 'mr-auto max-w-[85%] bg-white shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{chat.text}</p>
                      {chat.suggestion ? (
                        <div className="mt-3 rounded-xl bg-slate-900/5 p-3 text-xs text-slate-700">
                          <p className="font-semibold">Suggested: {chat.suggestion.specialist}</p>
                          <p>{chat.suggestion.reason}</p>
                          <p className="mt-1 uppercase tracking-wide text-slate-500">
                            Urgency: {chat.suggestion.urgency}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Example: chest tightness at night, dry cough, and shortness of breath"
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSendMessage} disabled={!message.trim()}>
                      <Bot className="mr-2 h-4 w-4" /> Ask assistant
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedRecord ? (
            <RecordDetails record={selectedRecord} />
          ) : (
            <>
              <Card className="border-emerald-100 bg-gradient-to-r from-emerald-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5 text-emerald-600" /> Running prescription
                  </CardTitle>
                  <CardDescription>
                    This opens by default when no chat or record is selected.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {workspace.activeMedicationPlan.map((medicine) => (
                    <div key={medicine.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{medicine.name}</p>
                          <p className="text-sm text-muted-foreground">{medicine.dosage}</p>
                        </div>
                        <Badge variant="outline">{medicine.frequency}</Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{medicine.instructions}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {medicine.times.map((time) => (
                          <Badge key={time} className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                            <Clock3 className="mr-1 h-3 w-3" /> {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-amber-500" /> Alarm and notification board
                  </CardTitle>
                  <CardDescription>
                    The user can set medicine times and receive in-app or browser reminders.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-slate-50 p-4">
                    <div>
                      <p className="font-medium">Browser notification mode</p>
                      <p className="text-sm text-muted-foreground">
                        Works like a lightweight auto-alarm while the app is open.
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleEnableNotifications}>
                      Enable alerts
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {workspace.reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
                      >
                        <div>
                          <p className="font-medium">{reminder.label}</p>
                          <p className="text-sm text-muted-foreground">
                            Last ping: {reminder.lastTriggeredAt || 'Not triggered yet'}
                          </p>
                        </div>
                        <Input
                          type="time"
                          value={reminder.time}
                          onChange={(event) =>
                            updateReminder(profile.id, reminder.id, { time: event.target.value })
                          }
                          className="w-full md:w-36"
                        />
                        <div className="flex items-center gap-3 justify-self-end">
                          <Switch
                            checked={reminder.enabled}
                            onCheckedChange={(checked) =>
                              updateReminder(profile.id, reminder.id, { enabled: checked })
                            }
                          />
                          <span className="text-sm">{reminder.enabled ? 'On' : 'Off'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-indigo-600" /> Doctor visit code
              </CardTitle>
              <CardDescription>
                Generate a code and share it with the doctor during a visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace.latestVisitCode ? (
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active code</p>
                  <p className="mt-2 text-3xl font-bold tracking-[0.25em]">{workspace.latestVisitCode.code}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Expires {format(new Date(workspace.latestVisitCode.expiresAt), 'PPP p')}
                  </p>
                </div>
              ) : null}
              <Button className="w-full" onClick={handleGenerateCode}>
                <Copy className="mr-2 h-4 w-4" /> Generate new visit code
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" /> Record list like messenger
              </CardTitle>
              <CardDescription>
                Click any item to open it in the main panel, or open specialist chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                type="button"
                onClick={() => setSelectedPanel('chat')}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedPanel === 'chat' ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-2 text-blue-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">Assistant chat</p>
                    <p className="text-sm text-muted-foreground">
                      Specialist suggestion from symptoms.
                    </p>
                  </div>
                </div>
              </button>
              {workspace.records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedPanel(record.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedPanel === record.id ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{record.title}</p>
                        <Badge variant="outline">{record.kind}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{record.summary}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{record.date}</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RecordDetails({ record }: { record: PatientRecord }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{record.title}</CardTitle>
        <CardDescription>
          {record.department} • {record.doctorName} • {record.date}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-700">{record.summary}</p>
        </div>
        <div className="space-y-3">
          {record.details.map((detail) => (
            <div key={detail} className="rounded-2xl border p-4 text-sm text-muted-foreground">
              {detail}
            </div>
          ))}
        </div>
        {record.medicines?.length ? (
          <div className="space-y-2">
            <p className="font-semibold">Medicine list</p>
            <div className="grid gap-3 md:grid-cols-2">
              {record.medicines.map((medicine) => (
                <div key={medicine.id} className="rounded-2xl border p-4">
                  <p className="font-medium">{medicine.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {medicine.dosage} • {medicine.instructions}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
