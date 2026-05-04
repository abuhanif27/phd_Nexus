'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  Coffee,
  AlertCircle,
  CalendarDays,
  Users,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
  isPast,
  parseISO,
} from 'date-fns';
import { getMyAvailability, setAvailability, deleteAvailability } from '../api';
import type { DoctorAvailability } from '@/types/api';

// ── Constants ────────────────────────────────────────────────────
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSION_DURATIONS = [
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
  { label: '2.5 hours', value: 150 },
  { label: '3 hours', value: 180 },
  { label: '4 hours', value: 240 },
  { label: '6 hours', value: 360 },
  { label: '8 hours', value: 480 },
];

const MINS_PER_PATIENT_OPTIONS = [
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
];

// ── Helpers ──────────────────────────────────────────────────────
function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h} hr${h > 1 ? 's' : ''}`;
}

/** Convert "HH:MM" or "HH:MM:SS" → "h:MM AM/PM" */
function fmtTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function breakMinutes(breaks: { start: string; end: string }[]): number {
  return breaks.reduce((acc, b) => {
    const [bsH, bsM] = b.start.split(':').map(Number);
    const [beH, beM] = b.end.split(':').map(Number);
    return acc + Math.max(0, beH * 60 + beM - (bsH * 60 + bsM));
  }, 0);
}

function calcAutoMax(
  sessionMin: number,
  minsPerPatient: number,
  breaks: { start: string; end: string }[]
): number {
  const net = sessionMin - breakMinutes(breaks);
  return Math.max(1, Math.floor(net / minsPerPatient));
}

// ── Types ────────────────────────────────────────────────────────
type Break = { start: string; end: string };

interface SlotForm {
  start_time: string;
  session_duration_minutes: number;
  max_patients: number;
  minutes_per_patient: number;
  breaks: Break[];
}

const DEFAULT_FORM: SlotForm = {
  start_time: '09:00',
  session_duration_minutes: 120,
  max_patients: 8,
  minutes_per_patient: 15,
  breaks: [],
};

// ══════════════════════════════════════════════════════════════════
// Root component
// ══════════════════════════════════════════════════════════════════

export function AvailabilityManager() {
  const qc = useQueryClient();

  const [viewDate, setViewDate] = React.useState(() => new Date());
  const month = viewDate.getMonth() + 1;
  const year = viewDate.getFullYear();

  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);

  const {
    data: slots = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['doctor', 'availability', year, month],
    queryFn: () => getMyAvailability({ month, year }),
  });

  const createMutation = useMutation({
    mutationFn: setAvailability,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'availability', year, month] });
      setDialogOpen(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAvailability,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'availability', year, month] });
      setDeleteTarget(null);
    },
  });

  // Build calendar grid (Mon-start)
  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 }),
  });

  // Index slots by date string
  const slotsByDate = React.useMemo(() => {
    const map: Record<string, DoctorAvailability[]> = {};
    for (const s of slots) {
      (map[s.date] ??= []).push(s);
    }
    return map;
  }, [slots]);

  // Fully-booked dates (every session on that date is at capacity)
  const fullyBookedDates = React.useMemo(() => {
    const set = new Set<string>();
    for (const [d, ss] of Object.entries(slotsByDate)) {
      if (ss.length && ss.every((s) => (s.booked_count ?? 0) >= s.max_patients)) set.add(d);
    }
    return set;
  }, [slotsByDate]);

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  const handleSave = (form: SlotForm) => {
    if (!selectedDate) return;
    createMutation.mutate({ date: selectedDate, ...form });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Availability</h1>
        <p className="mt-1 text-muted-foreground">
          Click a date to set sessions. Configure session length, time per patient, and max patients
          — slots are auto-calculated.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> Failed to load. Please refresh.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_370px]">
        {/* ── Calendar ── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{format(viewDate, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewDate((d) => subMonths(d, 1))}
                  aria-label="Prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setViewDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewDate((d) => addMonths(d, 1))}
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="mb-1 grid grid-cols-7">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {gridDays.map((day) => {
                const ds = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, viewDate);
                const today = isToday(day);
                const past = isPast(day) && !today;
                const selected = selectedDate === ds;
                const hasSlots = Boolean(slotsByDate[ds]?.length);
                const fullBooked = fullyBookedDates.has(ds);

                return (
                  <button
                    key={ds}
                    onClick={() => inMonth && setSelectedDate(ds)}
                    disabled={!inMonth}
                    className={[
                      'relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-sm transition-colors',
                      !inMonth ? 'cursor-default opacity-25' : 'cursor-pointer hover:bg-accent',
                      selected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
                      !selected && today ? 'border border-primary font-semibold text-primary' : '',
                      !selected && past && inMonth ? 'text-muted-foreground' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {format(day, 'd')}
                    {hasSlots && (
                      <span
                        className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${selected ? 'bg-primary-foreground' : fullBooked ? 'bg-red-500' : 'bg-primary'}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                Fully booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded border border-primary" />
                Today
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3.5 w-3.5 rounded bg-primary" />
                Selected
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ── Side panel ── */}
        <Card className="self-start">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selectedDate ? format(parseISO(selectedDate), 'EEE, MMM d yyyy') : 'Select a Date'}
              </CardTitle>
              {selectedDate && (
                <Button size="sm" onClick={() => setDialogOpen(true)} className="h-7 px-2 text-xs">
                  <Plus className="mr-1 h-3 w-3" /> Add Session
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="py-10 text-center text-muted-foreground">
                <CalendarDays className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm">
                  Click a date on the calendar
                  <br />
                  to manage its sessions.
                </p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : selectedSlots.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Clock className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm">No sessions on this date.</p>
                <p className="mt-1 text-xs">
                  Click &quot;Add Session&quot; to open it for bookings.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedSlots.map((slot) => (
                  <SessionCard
                    key={slot.id}
                    slot={slot}
                    onDelete={() => setDeleteTarget(slot.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add session dialog */}
      <SessionDialog
        open={dialogOpen}
        selectedDate={selectedDate}
        existingSlots={selectedSlots}
        saving={createMutation.isPending}
        serverError={(createMutation.error as Error)?.message}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Session</DialogTitle>
            <DialogDescription>
              Patients won&apos;t be able to book during this session.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget !== null && deleteMutation.mutate(deleteTarget)}
            >
              {deleteMutation.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SessionCard — displays one session in the side panel
// ══════════════════════════════════════════════════════════════════

function SessionCard({ slot, onDelete }: { slot: DoctorAvailability; onDelete: () => void }) {
  const booked = slot.booked_count ?? 0;
  const cap = slot.max_patients;
  const pct = cap > 0 ? Math.round((booked / cap) * 100) : 0;
  const full = booked >= cap;
  const open = cap - booked;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      {/* Time + actions */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
            </span>
            {full ? (
              <Badge variant="destructive" className="text-xs">
                FULLY BOOKED
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-300 text-xs text-green-700">
                {open} slot{open !== 1 ? 's' : ''} open
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {fmtDuration(slot.session_duration_minutes)} session · {slot.minutes_per_patient}{' '}
            min/patient
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" />
            Patients booked
          </span>
          <span
            className={`font-semibold ${full ? 'text-red-600' : booked > 0 ? 'text-amber-600' : 'text-green-600'}`}
          >
            {booked} / {cap}
          </span>
        </div>
        <Progress
          value={pct}
          className={`h-2.5 ${full ? '[&>div]:bg-red-500' : booked > cap * 0.75 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
        />
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>{cap} max patients</span>
          <span>·</span>
          <span>{slot.minutes_per_patient} min each</span>
        </div>
      </div>

      {/* Breaks */}
      {slot.breaks.length > 0 && (
        <div className="space-y-1 border-t pt-2">
          {slot.breaks.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coffee className="h-3 w-3" /> Break: {fmtTime(b.start)} – {fmtTime(b.end)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SessionDialog — add a new session
// ══════════════════════════════════════════════════════════════════

function SessionDialog({
  open,
  selectedDate,
  existingSlots,
  saving,
  serverError,
  onClose,
  onSave,
}: {
  open: boolean;
  selectedDate: string | null;
  existingSlots: DoctorAvailability[];
  saving: boolean;
  serverError?: string;
  onClose: () => void;
  onSave: (form: SlotForm) => void;
}) {
  const [form, setForm] = React.useState<SlotForm>(DEFAULT_FORM);
  const [manualMax, setManualMax] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setFormError('');

    const isToday = selectedDate === new Date().toISOString().slice(0, 10);

    // Start from current time (rounded up to next 30-min mark) for today,
    // or 09:00 for future dates.
    let baseMins = isToday
      ? Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30
      : 9 * 60;

    // Also advance past the end of any existing session on this date,
    // so we never suggest a time that's inside a running session.
    for (const slot of existingSlots) {
      const [h, m] = slot.end_time.split(':').map(Number);
      const endMins = h * 60 + m;
      if (endMins > baseMins) baseMins = endMins;
    }

    const h = Math.floor(baseMins / 60) % 24;
    const m = baseMins % 60;
    const defaultStart = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    setForm({ ...DEFAULT_FORM, start_time: defaultStart });
    setManualMax(false);
  }, [open, selectedDate, existingSlots]);

  // Auto-calculate max patients when dependencies change
  const autoMax = calcAutoMax(form.session_duration_minutes, form.minutes_per_patient, form.breaks);
  React.useEffect(() => {
    if (!manualMax) setForm((f) => ({ ...f, max_patients: autoMax }));
  }, [autoMax, manualMax]);

  const endTime = form.start_time
    ? computeEndTime(form.start_time, form.session_duration_minutes)
    : '';
  const totalPatientTime = form.max_patients * form.minutes_per_patient;
  const exceedsSession = totalPatientTime > form.session_duration_minutes;

  const addBreak = () => {
    setManualMax(false); // let auto-calc update max_patients to account for new break
    setForm((f) => {
      // Base the default break start on the session start + 30 min (or current time if today and later)
      const [sh, sm] = f.start_time.split(':').map(Number);
      let breakStartMins = sh * 60 + sm + 30; // 30 min into the session

      const isToday = selectedDate === new Date().toISOString().slice(0, 10);
      if (isToday) {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        // If "30 min into session" is already in the past, use next 30-min mark after now
        if (breakStartMins <= nowMins) {
          breakStartMins = Math.ceil(nowMins / 30) * 30;
        }
      }

      const breakEndMins = breakStartMins + 30; // 30-min break
      const fmt = (mins: number) => {
        const h = Math.floor(mins / 60) % 24;
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      return {
        ...f,
        breaks: [...f.breaks, { start: fmt(breakStartMins), end: fmt(breakEndMins) }],
      };
    });
  };
  const removeBreak = (i: number) => {
    setManualMax(false); // re-enable auto-calc after removing a break
    setForm((f) => ({ ...f, breaks: f.breaks.filter((_, idx) => idx !== i) }));
  };
  const updateBreak = (i: number, field: 'start' | 'end', v: string) =>
    setForm((f) => {
      const b = [...f.breaks];
      b[i] = { ...b[i], [field]: v };
      return { ...f, breaks: b };
    });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError('');
    for (const b of form.breaks) {
      if (b.start >= b.end) {
        setFormError('Each break end time must be after its start.');
        return;
      }
    }
    if (form.max_patients < 1) {
      setFormError('Max patients must be at least 1.');
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Session</DialogTitle>
          <DialogDescription>
            {selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM d yyyy') : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Start time */}
          <div className="space-y-1.5">
            <Label htmlFor="s-start">Session Start Time</Label>
            <Input
              id="s-start"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
              required
            />
          </div>

          {/* Duration + Per-patient time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Session Duration</Label>
              <Select
                value={String(form.session_duration_minutes)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, session_duration_minutes: Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Time per Patient</Label>
              <Select
                value={String(form.minutes_per_patient)}
                onValueChange={(v) => {
                  setManualMax(false);
                  setForm((f) => ({ ...f, minutes_per_patient: Number(v) }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINS_PER_PATIENT_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Max patients */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="s-max">Max Patients</Label>
              {manualMax && (
                <button
                  type="button"
                  onClick={() => setManualMax(false)}
                  className="text-xs text-primary hover:underline"
                >
                  Auto-calculate ({autoMax})
                </button>
              )}
            </div>
            <Input
              id="s-max"
              type="number"
              min={1}
              max={200}
              value={form.max_patients}
              onChange={(e) => {
                setManualMax(true);
                setForm((f) => ({
                  ...f,
                  max_patients: Math.max(1, parseInt(e.target.value, 10) || 1),
                }));
              }}
            />
            <p className="text-xs text-muted-foreground">
              Auto-suggested: <strong>{autoMax}</strong> patients based on your session length and
              breaks.
            </p>
          </div>

          {/* Minimal preview */}
          {form.start_time && endTime && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {fmtTime(form.start_time)} – {fmtTime(endTime)}
              </span>
              {' · '}
              {form.max_patients} patients
              {' · '}
              {form.minutes_per_patient} min each
              {exceedsSession && (
                <span className="ml-2 text-xs text-amber-600">⚠ exceeds session</span>
              )}
            </div>
          )}

          {/* Breaks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5" />
                Breaks (optional)
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addBreak}>
                <Plus className="mr-1 h-3 w-3" />
                Add Break
              </Button>
            </div>
            {form.breaks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No breaks — patients can book throughout the session.
              </p>
            ) : (
              form.breaks.map((brk, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={brk.start}
                    onChange={(e) => updateBreak(i, 'start', e.target.value)}
                    className="h-8 text-sm"
                    aria-label={`Break ${i + 1} start`}
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={brk.end}
                    onChange={(e) => updateBreak(i, 'end', e.target.value)}
                    className="h-8 text-sm"
                    aria-label={`Break ${i + 1} end`}
                  />
                  <button
                    type="button"
                    onClick={() => removeBreak(i)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {(formError || serverError) && (
            <p className="text-sm text-destructive">{formError || serverError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
