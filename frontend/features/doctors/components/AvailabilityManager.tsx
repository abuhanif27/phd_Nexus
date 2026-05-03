'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  Pencil,
  Coffee,
  AlertCircle,
  CalendarDays,
  Info,
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
import { getMyAvailability, setAvailability, updateAvailability, deleteAvailability } from '../api';
import type { DoctorAvailability } from '@/types/api';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Break = { start: string; end: string };
interface SlotFormState {
  start_time: string;
  end_time: string;
  breaks: Break[];
}
const DEFAULT_FORM: SlotFormState = { start_time: '09:00', end_time: '17:00', breaks: [] };

// ══════════════════════════════════════════════════════════════════
// Root component
// ══════════════════════════════════════════════════════════════════

export function AvailabilityManager() {
  const qc = useQueryClient();

  // Calendar navigation
  const [viewDate, setViewDate] = React.useState(() => new Date());
  const month = viewDate.getMonth() + 1; // 1-12
  const year = viewDate.getFullYear();

  // Selected date for the side panel
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  // Dialog state
  const [dialog, setDialog] = React.useState<{
    open: boolean;
    existing?: DoctorAvailability;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);

  // Fetch availability for the visible month
  const { data: slots = [], isLoading, error } = useQuery({
    queryKey: ['doctor', 'availability', year, month],
    queryFn: () => getMyAvailability({ month, year }),
  });

  const createMutation = useMutation({
    mutationFn: setAvailability,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'availability', year, month] });
      setDialog({ open: false });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<DoctorAvailability, 'id' | 'doctor'>> }) =>
      updateAvailability(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'availability', year, month] });
      setDialog({ open: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAvailability,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['doctor', 'availability', year, month] });
      setDeleteTarget(null);
    },
  });

  // Build the grid for the current month view (Mon-start weeks)
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Index slots by date string for O(1) lookups
  const slotsByDate = React.useMemo(() => {
    const map: Record<string, DoctorAvailability[]> = {};
    for (const slot of slots) {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    }
    return map;
  }, [slots]);

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, viewDate)) return;
    setSelectedDate(format(day, 'yyyy-MM-dd'));
  };

  const openAdd = () => setDialog({ open: true, existing: undefined });
  const openEdit = (slot: DoctorAvailability) => setDialog({ open: true, existing: slot });

  const handleSave = (formData: SlotFormState) => {
    if (!selectedDate) return;
    if (dialog.existing) {
      updateMutation.mutate({ id: dialog.existing.id, data: formData });
    } else {
      createMutation.mutate({ date: selectedDate, ...formData });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Availability</h1>
        <p className="mt-1 text-muted-foreground">
          Click any date to set your available hours. Patients book 30-minute slots within those windows.
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm">
          Dates with a <span className="font-semibold">blue dot</span> have availability set. Select a date to add, edit, or remove slots.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load availability. Please refresh.
        </div>
      )}

      {/* Calendar + Side panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
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
                  aria-label="Previous month"
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
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day-of-week headers */}
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
                const dateStr = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, viewDate);
                const today = isToday(day);
                const past = isPast(day) && !today;
                const selected = selectedDate === dateStr;
                const hasSlots = Boolean(slotsByDate[dateStr]?.length);

                return (
                  <button
                    key={dateStr}
                    onClick={() => handleDayClick(day)}
                    disabled={!inMonth}
                    className={[
                      'relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-sm transition-colors',
                      !inMonth ? 'cursor-default opacity-25' : 'cursor-pointer hover:bg-accent',
                      selected
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : today
                          ? 'border border-primary font-semibold text-primary'
                          : past && inMonth
                            ? 'text-muted-foreground'
                            : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span>{format(day, 'd')}</span>
                    {hasSlots && (
                      <span
                        className={`absolute bottom-1 h-1 w-1 rounded-full ${
                          selected ? 'bg-primary-foreground' : 'bg-primary'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                Has slots
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
                {selectedDate
                  ? format(parseISO(selectedDate), 'EEE, MMM d yyyy')
                  : 'Select a Date'}
              </CardTitle>
              {selectedDate && (
                <Button size="sm" onClick={openAdd} className="h-7 px-2 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Slot
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="py-8 text-center text-muted-foreground">
                <CalendarDays className="mx-auto mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">Click a date on the calendar to manage its slots.</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : selectedSlots.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Clock className="mx-auto mb-2 h-10 w-10 opacity-40" />
                <p className="text-sm">No slots for this date.</p>
                <p className="mt-1 text-xs">Click &quot;Add Slot&quot; to make it available.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSlots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onEdit={() => openEdit(slot)}
                    onDelete={() => setDeleteTarget(slot.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit dialog */}
      <SlotDialog
        open={dialog.open}
        selectedDate={selectedDate}
        existing={dialog.existing}
        saving={createMutation.isPending || updateMutation.isPending}
        serverError={
          (createMutation.error as Error)?.message || (updateMutation.error as Error)?.message
        }
        onClose={() => setDialog({ open: false })}
        onSave={handleSave}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Slot</DialogTitle>
            <DialogDescription>
              Patients won&apos;t be able to book during this time period.
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
// SlotCard — one availability block in the side panel
// ══════════════════════════════════════════════════════════════════

function SlotCard({
  slot,
  onEdit,
  onDelete,
}: {
  slot: DoctorAvailability;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="font-semibold">
            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
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

      {slot.breaks.length > 0 && (
        <div className="mt-2 space-y-1">
          {slot.breaks.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Coffee className="h-3 w-3" />
              Break: {b.start} – {b.end}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-xs">
          30-min slots
        </Badge>
        {slot.breaks.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {slot.breaks.length} break{slot.breaks.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SlotDialog — create or edit a slot for a specific date
// ══════════════════════════════════════════════════════════════════

function SlotDialog({
  open,
  selectedDate,
  existing,
  saving,
  serverError,
  onClose,
  onSave,
}: {
  open: boolean;
  selectedDate: string | null;
  existing?: DoctorAvailability;
  saving: boolean;
  serverError?: string;
  onClose: () => void;
  onSave: (data: SlotFormState) => void;
}) {
  const [form, setForm] = React.useState<SlotFormState>(DEFAULT_FORM);
  const [formError, setFormError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setFormError('');
      if (existing) {
        setForm({
          start_time: existing.start_time.slice(0, 5),
          end_time: existing.end_time.slice(0, 5),
          breaks: existing.breaks.map((b) => ({ ...b })),
        });
      } else {
        setForm(DEFAULT_FORM);
      }
    }
  }, [existing, open]);

  const addBreak = () =>
    setForm((f) => ({ ...f, breaks: [...f.breaks, { start: '12:00', end: '13:00' }] }));

  const removeBreak = (i: number) =>
    setForm((f) => ({ ...f, breaks: f.breaks.filter((_, idx) => idx !== i) }));

  const updateBreak = (i: number, field: 'start' | 'end', value: string) =>
    setForm((f) => {
      const breaks = [...f.breaks];
      breaks[i] = { ...breaks[i], [field]: value };
      return { ...f, breaks };
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (form.start_time >= form.end_time) {
      setFormError('End time must be after start time.');
      return;
    }
    for (const brk of form.breaks) {
      if (brk.start >= brk.end) {
        setFormError('Each break end time must be after its start.');
        return;
      }
      if (brk.start < form.start_time || brk.end > form.end_time) {
        setFormError('Breaks must fall within the slot time range.');
        return;
      }
    }
    onSave(form);
  };

  const dateLabel = selectedDate
    ? format(parseISO(selectedDate), 'EEEE, MMMM d yyyy')
    : '';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit' : 'Add'} Slot</DialogTitle>
          <DialogDescription>{dateLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="slot-start">Start Time</Label>
              <Input
                id="slot-start"
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slot-end">End Time</Label>
              <Input
                id="slot-end"
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

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
                No breaks — patients can book throughout the entire slot.
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
              {saving ? 'Saving…' : existing ? 'Update' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
