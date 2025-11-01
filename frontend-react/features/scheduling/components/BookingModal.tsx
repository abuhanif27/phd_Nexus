'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User, FileText, Loader2 } from 'lucide-react';
import { getDoctors } from '@/features/doctors/api';
import { getAvailableSlots, bookAppointment } from '@/features/scheduling/api';
import { useAuthStore } from '@/features/auth/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const bookingSchema = z.object({
  doctor: z.number().min(1, 'Please select a doctor'),
  date: z.string().min(1, 'Please select a date'),
  time_slot: z.string().min(1, 'Please select a time slot'),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  preselectedDoctorId?: number;
}

export function BookingModal({ open, onClose, preselectedDoctorId }: BookingModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(
    preselectedDoctorId || null
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      doctor: preselectedDoctorId || 0,
      date: '',
      time_slot: '',
      notes: '',
    },
  });

  // Fetch doctors
  const { data: doctorsData, isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => getDoctors({}),
  });

  const doctors = doctorsData?.results || [];

  // Generate next 14 days for date selection
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(startOfDay(new Date()), i);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE, MMM d'),
    };
  });

  // Fetch available slots when doctor and date are selected
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['available-slots', selectedDoctorId, selectedDate],
    queryFn: () => getAvailableSlots(selectedDoctorId!, selectedDate),
    enabled: !!selectedDoctorId && !!selectedDate,
  });

  const availableSlots = slotsData?.slots || [];

  // Book appointment mutation
  const bookMutation = useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      toast.success('Appointment booked successfully!');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to book appointment');
    },
  });

  const onSubmit = (data: BookingFormData) => {
    if (!user?.patient_profile?.id) {
      toast.error('Patient profile not found');
      return;
    }

    // Parse time slot (format: "HH:MM")
    const [startTime, endTime] = data.time_slot.split('-');

    bookMutation.mutate({
      doctor: data.doctor,
      patient: user.patient_profile.id,
      date: data.date,
      start_time: startTime,
      end_time: endTime,
      notes: data.notes || '',
    });
  };

  const handleDoctorChange = (doctorId: string) => {
    const id = Number(doctorId);
    setSelectedDoctorId(id);
    setValue('doctor', id);
    // Reset date and time when doctor changes
    setSelectedDate('');
    setSelectedTimeSlot('');
    setValue('date', '');
    setValue('time_slot', '');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setValue('date', date);
    // Reset time when date changes
    setSelectedTimeSlot('');
    setValue('time_slot', '');
  };

  const handleTimeSlotChange = (slot: string) => {
    setSelectedTimeSlot(slot);
    setValue('time_slot', slot);
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Book an Appointment</DialogTitle>
          <DialogDescription>
            Choose a doctor, select a date and time slot to book your appointment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Select Doctor */}
          <div className="space-y-2">
            <Label htmlFor="doctor" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Doctor
            </Label>
            <Select
              value={selectedDoctorId?.toString() || ''}
              onValueChange={handleDoctorChange}
              disabled={loadingDoctors}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a doctor..." />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Dr. {doctor.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {doctor.specialty}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctor && <p className="text-sm text-red-600">{errors.doctor.message}</p>}
          </div>

          {/* Selected Doctor Info */}
          {selectedDoctor && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                    {selectedDoctor.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Dr. {selectedDoctor.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedDoctor.specialty}</p>
                    {selectedDoctor.location && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        📍 {selectedDoctor.location}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-yellow-500 text-white">
                    ⭐ {selectedDoctor.rating.toFixed(1)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Date */}
          {selectedDoctorId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Select Date
              </Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {availableDates.map((date) => (
                  <button
                    key={date.value}
                    type="button"
                    onClick={() => handleDateChange(date.value)}
                    className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                      selectedDate === date.value
                        ? 'border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    {date.label}
                  </button>
                ))}
              </div>
              {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
            </div>
          )}

          {/* Step 3: Select Time Slot */}
          {selectedDate && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Select Time Slot
              </Label>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading slots...</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto md:grid-cols-4">
                  {availableSlots.map((slot) => {
                    const slotValue = `${slot.start_time}-${slot.end_time}`;
                    return (
                      <button
                        key={slotValue}
                        type="button"
                        onClick={() => handleTimeSlotChange(slotValue)}
                        className={`rounded-lg border-2 p-2 text-sm font-medium transition-all ${
                          selectedTimeSlot === slotValue
                            ? 'border-green-600 bg-green-50 text-green-600 dark:bg-green-900/20'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        {slot.start_time}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No available slots for this date. Please choose another date.
                </p>
              )}
              {errors.time_slot && (
                <p className="text-sm text-red-600">{errors.time_slot.message}</p>
              )}
            </div>
          )}

          {/* Step 4: Notes (Optional) */}
          {selectedTimeSlot && (
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Additional Notes <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Describe your symptoms or reason for visit..."
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bookMutation.isPending || !selectedTimeSlot}
              className="flex-1"
            >
              {bookMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
