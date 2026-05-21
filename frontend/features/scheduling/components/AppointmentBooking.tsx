'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Clock, User, Search, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/hooks';
import { getDoctors } from '@/features/doctors/api';
import { getAvailableSlots, bookAppointment } from '@/features/scheduling/api';
import { format, addDays, parseISO } from 'date-fns';
import type { Doctor } from '@/types/api';

const bookingSchema = z.object({
  doctor_id: z.number(),
  date: z.string(),
  time_slot: z.string(),
  notes: z.string().optional(),
});

type BookingInput = z.infer<typeof bookingSchema>;

/**
 * Appointment Booking Flow
 * Step 1: Select Doctor
 * Step 2: Select Date
 * Step 3: Select Time Slot
 * Step 4: Confirm Booking
 */
export function AppointmentBooking() {
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(1);
  const [selectedDoctor, setSelectedDoctor] = React.useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string>('');
  const [selectedSlot, setSelectedSlot] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState('');

  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const { register, handleSubmit, setValue } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
  });

  // Fetch doctors with optional search
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', searchQuery],
    queryFn: () => getDoctors({ search: searchQuery }),
  });

  // Fetch available slots when doctor and date are selected
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', selectedDoctor?.id, selectedDate],
    queryFn: () => getAvailableSlots(selectedDoctor!.id, selectedDate),
    enabled: !!selectedDoctor && !!selectedDate,
  });

  // Book appointment mutation
  const { mutate: book, isPending: isBooking } = useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      toast({
        title: 'Appointment Booked!',
        description: 'Your appointment has been successfully scheduled.',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'availability'] });
      setStep(4);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data?.non_field_errors?.[0] ||
          'Failed to book appointment',
      });
    },
  });

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setValue('doctor_id', doctor.id);
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setValue('date', date);
    setStep(3);
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setValue('time_slot', slot);
  };

  const onSubmit = (data: BookingInput) => {
    if (!currentUser?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User information not available',
      });
      return;
    }
    const [startTime, endTime] = data.time_slot.split(' - ');
    book({
      doctor: data.doctor_id,
      patient: currentUser.id,
      date: data.date,
      start_time: startTime,
      end_time: endTime,
      notes: data.notes,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        <StepIndicator number={1} label="Select Doctor" active={step >= 1} completed={step > 1} />
        <div className="h-0.5 w-12 bg-border" />
        <StepIndicator number={2} label="Choose Date" active={step >= 2} completed={step > 2} />
        <div className="h-0.5 w-12 bg-border" />
        <StepIndicator number={3} label="Pick Time" active={step >= 3} completed={step > 3} />
        <div className="h-0.5 w-12 bg-border" />
        <StepIndicator number={4} label="Confirm" active={step >= 4} completed={step > 4} />
      </div>

      {/* Step 1: Select Doctor */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Doctor</CardTitle>
            <CardDescription>Choose the specialist you want to consult</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or specialty..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Doctors List */}
            {doctorsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {(Array.isArray(doctorsData) ? doctorsData : (doctorsData?.results || [])).map((doctor) => (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    onSelect={() => handleDoctorSelect(doctor)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Date */}
      {step === 2 && selectedDoctor && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Date</CardTitle>
            <CardDescription>
              Booking with Dr. {selectedDoctor.name} - {selectedDoctor.specialty}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 14 }, (_, i) => {
                const date = addDays(new Date(), i);
                const dateString = format(date, 'yyyy-MM-dd');
                return (
                  <Button
                    key={dateString}
                    variant={selectedDate === dateString ? 'default' : 'outline'}
                    className="flex h-auto flex-col py-3"
                    onClick={() => handleDateSelect(dateString)}
                  >
                    <span className="text-xs text-muted-foreground">{format(date, 'EEE')}</span>
                    <span className="text-lg font-bold">{format(date, 'd')}</span>
                    <span className="text-xs">{format(date, 'MMM')}</span>
                  </Button>
                );
              })}
            </div>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Back to Doctor Selection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Time Slot */}
      {step === 3 && selectedDoctor && selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>Select Time Slot</CardTitle>
            <CardDescription>
              Available slots on {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {slotsLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : availableSlots && availableSlots.slots && availableSlots.slots.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {availableSlots.slots.map((slot) => {
                    const slotValue = `${slot.start_time} - ${slot.end_time}`;
                    
                    const formatTime12h = (time24: string) => {
                      const [hoursStr, minutes] = time24.split(':');
                      const hours = parseInt(hoursStr, 10);
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      const hours12 = hours % 12 || 12;
                      return `${hours12}:${minutes} ${ampm}`;
                    };
                    
                    const displayLabel = `${formatTime12h(slot.start_time)} - ${formatTime12h(slot.end_time)}`;

                    return (
                      <Button
                        key={slotValue}
                        variant={selectedSlot === slotValue ? 'default' : 'outline'}
                        onClick={() => handleSlotSelect(slotValue)}
                        disabled={!slot.available}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {displayLabel}
                      </Button>
                    );
                  })}
                </div>
                {selectedSlot && (
                  <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Describe your symptoms or reason for visit..."
                        {...register('notes')}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="button" variant="ghost" onClick={() => setStep(2)}>
                        Back
                      </Button>
                      <Button type="submit" disabled={isBooking} className="flex-1">
                        {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Booking
                      </Button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No available slots for this date</p>
                <Button variant="link" onClick={() => setStep(2)} className="mt-2">
                  Choose another date
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Appointment Confirmed!</h3>
                <p className="mt-1 text-muted-foreground">
                  Your appointment has been successfully booked
                </p>
              </div>
              <div className="space-y-2 rounded-lg bg-white p-4 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Doctor:</span>
                  <span className="font-medium">Dr. {selectedDoctor?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedSlot}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/dashboard')}
                  className="flex-1"
                >
                  Back to Dashboard
                </Button>
                <Button
                  onClick={() => (window.location.href = '/dashboard/appointments')}
                  className="flex-1"
                >
                  View Appointments
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========================================
// Component: StepIndicator
// ========================================
function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
          completed
            ? 'bg-primary text-primary-foreground'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {completed ? <CheckCircle2 className="h-5 w-5" /> : number}
      </div>
      <span className="text-center text-xs">{label}</span>
    </div>
  );
}

// ========================================
// Component: DoctorCard
// ========================================
function DoctorCard({ doctor, onSelect }: { doctor: Doctor; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <div className="flex-shrink-0">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">Dr. {doctor.name}</p>
            <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
          </div>
          <Badge variant="outline" className="ml-2">
            ⭐ {doctor.rating.toFixed(1)}
          </Badge>
        </div>
        {doctor.bio && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{doctor.bio}</p>
        )}
        {doctor.location && (
          <p className="mt-1 text-xs text-muted-foreground">📍 {doctor.location}</p>
        )}
      </div>
    </div>
  );
}
