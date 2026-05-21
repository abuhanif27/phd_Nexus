'use client';

import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Loader2, User, Clock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { searchPatients } from '@/features/patients/api';
import { serviceProvidersApi } from '../api';
import type { ProviderService, ServiceAvailability, Patient } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';

interface ProviderBookingModalProps {
  open: boolean;
  onClose: () => void;
  activeServices: ProviderService[];
  availabilities: ServiceAvailability[];
  onSuccess: () => void;
}

export function ProviderBookingModal({
  open,
  onClose,
  activeServices,
  availabilities,
  onSuccess,
}: ProviderBookingModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const [selectedService, setSelectedService] = React.useState<string>('');
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [selectedTime, setSelectedTime] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');

  // Search patients
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['patient-search', searchQuery],
    queryFn: () => searchPatients(searchQuery),
    enabled: searchQuery.trim().length >= 2,
  });

  const patients = searchResults?.results || [];

  // Available dates from availabilities
  const availableDates = React.useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return [...new Set(availabilities.map(a => a.date).filter(d => d >= today))].sort();
  }, [availabilities]);

  // Slots for selected date + service
  const slotsForDate = React.useMemo(() => {
    if (!selectedDate) return [];
    return availabilities.filter(a => {
      if (a.date !== selectedDate) return false;
      if (selectedService && a.service && a.service !== Number(selectedService)) return false;
      return true;
    });
  }, [availabilities, selectedDate, selectedService]);

  const bookMutation = useMutation({
    mutationFn: () =>
      serviceProvidersApi.createBooking({
        patient_code: selectedPatient?.patient_code,
        service: Number(selectedService),
        date: selectedDate,
        preferred_time: selectedTime || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Patient booked successfully.' });
      onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Booking failed.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setSearchQuery('');
    setSelectedPatient(null);
    setSelectedService('');
    setSelectedDate('');
    setSelectedTime('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Patient into Slot</DialogTitle>
          <DialogDescription>
            Search for a patient, pick a service and time slot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: Search & Select Patient */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 font-semibold">
              <User className="h-4 w-4" /> 1. Select Patient
            </Label>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-lg border bg-green-50 p-3">
                <div>
                  <p className="font-medium">{selectedPatient.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPatient.patient_code}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); }}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, code, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Searching...</div>}
                {patients.length > 0 && (
                  <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); }}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <div>
                          <span className="font-medium">{p.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{p.patient_code}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Step 2: Service + Date */}
          {selectedPatient && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold">
                <Clock className="h-4 w-4" /> 2. Service & Date
              </Label>
              <Select value={selectedService} onValueChange={(v) => { setSelectedService(v); setSelectedDate(''); setSelectedTime(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedService && (
                <div className="space-y-2">
                  <Label className="text-sm">Pick a date</Label>
                  {availableDates.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {availableDates.slice(0, 14).map(d => (
                        <Button
                          key={d}
                          type="button"
                          size="sm"
                          variant={selectedDate === d ? 'default' : 'outline'}
                          onClick={() => { setSelectedDate(d); setSelectedTime(''); }}
                        >
                          {format(new Date(d + 'T00:00'), 'MMM d')}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No availability slots configured. Add slots in Availability Management first.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Time slot + confirm */}
          {selectedDate && slotsForDate.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> 3. Time Slot
              </Label>
              <div className="flex flex-wrap gap-2">
                {slotsForDate.map(slot => {
                  const fmtTime = (t: string) => {
                    const [h, m] = t.split(':').map(Number);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
                  };
                  return (
                    <Button
                      key={slot.id}
                      type="button"
                      size="sm"
                      variant={selectedTime === slot.start_time ? 'default' : 'outline'}
                      onClick={() => setSelectedTime(slot.start_time)}
                    >
                      {fmtTime(slot.start_time)} – {fmtTime(slot.end_time)}
                      <Badge variant="secondary" className="ml-2 text-[10px]">{slot.slots_per_session} cap</Badge>
                    </Button>
                  );
                })}
              </div>

              {selectedTime && (
                <div className="space-y-2">
                  <Label className="text-sm">Notes (optional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for booking..."
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            disabled={!selectedPatient || !selectedService || !selectedDate || !selectedTime || bookMutation.isPending}
            onClick={() => bookMutation.mutate()}
          >
            {bookMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...</> : 'Confirm Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
