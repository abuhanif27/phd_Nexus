'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Stethoscope,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '@/lib/api/axios';
import type { Appointment } from '@/types/api';
import { format, isToday, parseISO } from 'date-fns';

export default function ConsultationsPage() {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<{ open: boolean; apt?: Appointment }>({ open: false });
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/scheduling/appointments/');
      return data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) =>
      apiClient.patch(`/api/scheduling/appointments/${id}/`, { status: 'done', notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultations'] });
      setDialog({ open: false });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => apiClient.patch(`/api/scheduling/appointments/${id}/cancel/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['consultations'] }),
  });

  const saveNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) =>
      apiClient.patch(`/api/scheduling/appointments/${id}/`, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consultations'] });
      setDialog({ open: false });
    },
  });

  const all: Appointment[] = Array.isArray(data) ? data : data?.results || [];
  const todayList = all.filter((a) => a.status === 'scheduled' && isToday(parseISO(a.date)));
  const upcomingList = all.filter((a) => a.status === 'scheduled' && !isToday(parseISO(a.date)));
  const completedList = all.filter((a) => a.status === 'done').slice(0, 10);

  const openDialog = (apt: Appointment) => {
    setNotes(apt.notes || '');
    setDialog({ open: true, apt });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consultations</h1>
        <p className="mt-1 text-muted-foreground">
          Manage patient consultations, add clinical notes, and mark sessions complete.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Today', count: todayList.length, icon: Stethoscope, color: 'blue' },
          { label: 'Upcoming', count: upcomingList.length, icon: Calendar, color: 'amber' },
          { label: 'Completed', count: completedList.length, icon: CheckCircle2, color: 'green' },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-full bg-${color}-100 p-3 dark:bg-${color}-900/30`}>
                <Icon className={`h-6 w-6 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Today&apos;s Consultations
          </CardTitle>
          <CardDescription>{format(new Date(), 'EEEE, MMMM d yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : todayList.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Stethoscope className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">No consultations scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayList.map((apt) => (
                <ConsultCard
                  key={apt.id}
                  apt={apt}
                  highlight
                  onNotes={() => openDialog(apt)}
                  onComplete={() => openDialog(apt)}
                  onCancel={() => cancelMutation.mutate(apt.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming */}
      {upcomingList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>{upcomingList.length} scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingList.map((apt) => (
                <ConsultCard
                  key={apt.id}
                  apt={apt}
                  onNotes={() => openDialog(apt)}
                  onCancel={() => cancelMutation.mutate(apt.id)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {completedList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedList.map((apt) => (
                <ConsultCard key={apt.id} apt={apt} dimmed onNotes={() => openDialog(apt)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes dialog */}
      <Dialog open={dialog.open} onOpenChange={() => setDialog({ open: false })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Consultation Notes</DialogTitle>
          </DialogHeader>
          {dialog.apt && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{dialog.apt.patient_name || 'Patient'}</p>
                <p className="text-muted-foreground">
                  {format(parseISO(dialog.apt.date), 'EEE, MMM d')} · {dialog.apt.start_time}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Clinical Notes</label>
                <Textarea
                  rows={5}
                  placeholder="Diagnosis, prescription, follow-up instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              {dialog.apt.status === 'scheduled' && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-xs">
                    &quot;Mark Complete&quot; will close this consultation and save notes.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialog({ open: false })}>
              Cancel
            </Button>
            {dialog.apt?.status === 'scheduled' && (
              <Button
                variant="outline"
                disabled={saveNotesMutation.isPending}
                onClick={() => dialog.apt && saveNotesMutation.mutate({ id: dialog.apt.id, notes })}
              >
                Save Notes
              </Button>
            )}
            {dialog.apt?.status === 'scheduled' && (
              <Button
                disabled={completeMutation.isPending}
                onClick={() => dialog.apt && completeMutation.mutate({ id: dialog.apt.id, notes })}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Complete
              </Button>
            )}
            {dialog.apt?.status === 'done' && (
              <Button
                disabled={saveNotesMutation.isPending}
                onClick={() => dialog.apt && saveNotesMutation.mutate({ id: dialog.apt.id, notes })}
              >
                Update Notes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsultCard({
  apt,
  highlight = false,
  dimmed = false,
  onNotes,
  onComplete,
  onCancel,
}: {
  apt: Appointment;
  highlight?: boolean;
  dimmed?: boolean;
  onNotes?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${highlight ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20' : 'hover:bg-accent/50'} ${dimmed ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white p-2 shadow-sm dark:bg-gray-800">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-0.5">
            <p className="font-semibold">{apt.patient_name || 'Patient'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(apt.date), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {apt.start_time} – {apt.end_time}
              </span>
            </div>
            {apt.notes && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{apt.notes}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              apt.status === 'done' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }
          >
            {apt.status}
          </Badge>
          {onNotes && (
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onNotes}>
              <FileText className="h-3.5 w-3.5" />
              {apt.notes ? 'Edit Notes' : 'Add Notes'}
            </Button>
          )}
          {apt.status === 'scheduled' && onComplete && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-green-300 text-xs text-green-600 hover:bg-green-50"
              onClick={onComplete}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete
            </Button>
          )}
          {apt.status === 'scheduled' && onCancel && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-red-300 text-xs text-red-600 hover:bg-red-50"
              onClick={onCancel}
            >
              <XCircle className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
