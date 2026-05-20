'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  CalendarDays,
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
  parseISO,
} from 'date-fns';
import { serviceProvidersApi } from '../api';
import type { ServiceAvailability, ProviderService } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmtTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface ServiceAvailabilityManagerProps {
  activeServices: ProviderService[];
}

export function ServiceAvailabilityManager({ activeServices }: ServiceAvailabilityManagerProps) {
  const { toast } = useToast();
  const [viewDate, setViewDate] = React.useState(() => new Date());
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<number | null>(null);
  const [availabilities, setAvailabilities] = React.useState<ServiceAvailability[]>([]);

  const [availForm, setAvailForm] = React.useState({
    service: 'all' as string | number,
    start_time: '09:00',
    end_time: '17:00',
    slots_per_session: 10,
  });

  const loadAvailabilities = async () => {
    try {
      const data = await serviceProvidersApi.listAvailability();
      setAvailabilities(data);
    } catch (err) {
      console.error('Failed to load availability', err);
    }
  };

  React.useEffect(() => {
    loadAvailabilities();
  }, []);

  const gridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 }),
  });

  const availByDate = React.useMemo(() => {
    const map: Record<string, ServiceAvailability[]> = {};
    for (const a of availabilities) {
      (map[a.date] ??= []).push(a);
    }
    return map;
  }, [availabilities]);

  const selectedSlots = selectedDate ? (availByDate[selectedDate] ?? []) : [];

  const handleSave = async () => {
    if (!selectedDate) return;
    try {
      const payload = {
        ...availForm,
        date: selectedDate,
        service: availForm.service === '' ? null : Number(availForm.service),
      };
      await serviceProvidersApi.createAvailability(payload);
      toast({ title: 'Success', description: 'Availability slot added.' });
      setDialogOpen(false);
      loadAvailabilities();
    } catch (err: any) {
      toast({ 
        title: 'Error', 
        description: err?.response?.data?.error || 'Could not save availability.', 
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await serviceProvidersApi.deleteAvailability(deleteTarget);
      toast({ description: 'Availability removed.' });
      setDeleteTarget(null);
      loadAvailabilities();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to remove slot.', variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_370px]">
      {/* Calendar Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">{format(viewDate, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewDate(d => subMonths(d, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setViewDate(new Date())}>
                Today
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setViewDate(d => addMonths(d, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-1 grid grid-cols-7">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {gridDays.map(day => {
              const ds = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, viewDate);
              const today = isToday(day);
              const selected = selectedDate === ds;
              const hasSlots = Boolean(availByDate[ds]?.length);

              return (
                <button
                  key={ds}
                  onClick={() => inMonth && setSelectedDate(ds)}
                  disabled={!inMonth}
                  className={[
                    'relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-xl text-sm transition-colors',
                    !inMonth ? 'cursor-default opacity-25' : 'cursor-pointer hover:bg-slate-100',
                    selected ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : '',
                    !selected && today ? 'border-2 border-blue-600 font-bold text-blue-600' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {format(day, 'd')}
                  {hasSlots && (
                    <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${selected ? 'bg-white' : 'bg-blue-600'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Side Panel */}
      <Card className="self-start">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {selectedDate ? format(parseISO(selectedDate), 'EEE, MMM d yyyy') : 'Select a Date'}
            </CardTitle>
            {selectedDate && (
              <Button size="sm" onClick={() => setDialogOpen(true)} className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Slot
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {!selectedDate ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="text-sm">Click a date to manage<br />operational slots.</p>
            </div>
          ) : selectedSlots.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="text-sm">No slots configured.</p>
              <Button variant="link" size="sm" onClick={() => setDialogOpen(true)} className="text-blue-600">
                Create the first slot
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSlots.map(slot => (
                <div key={slot.id} className="group relative rounded-xl border p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Clock className="h-4 w-4 text-blue-600" />
                        {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[10px] bg-white">
                          {slot.slots_per_session} Patients
                        </Badge>
                        {slot.service ? (
                          <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-100">
                            {activeServices.find(s => s.id === slot.service)?.name || 'Service'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-slate-50">General</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(slot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Availability Slot</DialogTitle>
            <DialogDescription>
              {selectedDate && format(parseISO(selectedDate), 'EEEE, MMMM d yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Target Service</Label>
              <Select value={String(availForm.service)} onValueChange={v => setAvailForm({...availForm, service: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Services" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General (All Services)</SelectItem>
                  {activeServices.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={availForm.start_time} onChange={e => setAvailForm({...availForm, start_time: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={availForm.end_time} onChange={e => setAvailForm({...availForm, end_time: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Patient Capacity</Label>
              <Input type="number" value={availForm.slots_per_session} onChange={e => setAvailForm({...availForm, slots_per_session: Number(e.target.value)})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Add Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Slot</DialogTitle>
            <DialogDescription>
              This availability window will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
