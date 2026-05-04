'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, startOfDay } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  FileText,
  Loader2,
  Search,
  MapPin,
  Star,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { getDoctors } from '@/features/doctors/api';
import { getAvailableSlots, bookAppointment } from '@/features/scheduling/api';
import { useAuthStore } from '@/features/auth/store';
import { useCurrentUser } from '@/features/auth/hooks';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  const { user: storedUser } = useAuthStore();
  const { data: freshUser } = useCurrentUser();
  // Prefer fresh API data (has patient_profile.id); fall back to store while loading
  const user = freshUser ?? storedUser;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(
    preselectedDoctorId || null
  );
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [grantConsent, setGrantConsent] = useState<boolean>(true); // Default to true for convenience

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

  const doctors = Array.isArray(doctorsData) ? doctorsData : (doctorsData?.results || []);

  // Filter doctors based on search and specialty
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor) => {
      const matchesSearch =
        searchQuery === '' ||
        doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSpecialty =
        selectedSpecialty === 'all' || doctor.specialty === selectedSpecialty;

      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, searchQuery, selectedSpecialty]);

  // Get unique specialties for filter
  const specialties = useMemo(() => {
    const uniqueSpecialties = Array.from(new Set(doctors.map((d) => d.specialty)));
    return ['all', ...uniqueSpecialties];
  }, [doctors]);

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
      const d = error?.response?.data;
      let msg = 'Failed to book appointment';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.error) msg = d.error;
        else if (d.detail) msg = d.detail;
        else if (d.non_field_errors) msg = d.non_field_errors[0];
        else {
          // Pick the first field error
          const first = Object.values(d)[0];
          if (Array.isArray(first)) msg = first[0] as string;
          else if (typeof first === 'string') msg = first;
        }
      }
      toast.error(msg);
    },
  });

  const onSubmit = (data: BookingFormData) => {
    // Parse time slot (format: "HH:MM-HH:MM")
    const [startTime, endTime] = data.time_slot.split('-');

    bookMutation.mutate({
      doctor: data.doctor,
      // patient is auto-assigned server-side from the JWT token;
      // sending it here too keeps the serializer happy as a fallback.
      patient: (user as any)?.patient_profile?.id,
      date: data.date,
      start_time: startTime,
      end_time: endTime,
      notes: data.notes || '',
      grant_consent: grantConsent,
    });
  };

  const handleDoctorChange = (doctorId: number) => {
    setSelectedDoctorId(doctorId);
    setValue('doctor', doctorId);
    setStep(2);
    // Reset date and time when doctor changes
    setSelectedDate('');
    setSelectedTimeSlot('');
    setValue('date', '');
    setValue('time_slot', '');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setValue('date', date);
    setStep(3);
    // Reset time when date changes
    setSelectedTimeSlot('');
    setValue('time_slot', '');
  };

  const handleTimeSlotChange = (slot: string) => {
    setSelectedTimeSlot(slot);
    setValue('time_slot', slot);
    setStep(4);
  };

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        {/* Header */}
        <div className="border-b bg-white px-6 py-6 dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <Sparkles className="h-6 w-6 text-blue-600" />
              Book Your Appointment
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Find your doctor, pick a time, and get the care you need
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="mt-6 flex items-center justify-between">
            {[
              { num: 1, label: 'Doctor', icon: User },
              { num: 2, label: 'Date', icon: CalendarIcon },
              { num: 3, label: 'Time', icon: Clock },
              { num: 4, label: 'Confirm', icon: CheckCircle2 },
            ].map((s, idx) => (
              <div key={s.num} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                      step >= s.num
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-800'
                    }`}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`mt-1 text-xs font-medium ${step >= s.num ? 'text-blue-600' : 'text-gray-500'}`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 transition-all ${
                      step > s.num ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <ScrollArea className="max-h-[50vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col px-6 py-4">
            {/* Step 1: Select Doctor */}
            {step >= 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Choose Your Doctor</h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {filteredDoctors.length} Available
                  </Badge>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by name or specialty..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mx-1 pl-10"
                    />
                  </div>
                  <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                    <SelectTrigger className="mx-1 w-full sm:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specialties</SelectItem>
                      {specialties.slice(1).map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Doctors List */}
                <div className="space-y-3">
                  {loadingDoctors ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : filteredDoctors.length > 0 ? (
                    filteredDoctors.map((doctor) => (
                      <Card
                        key={doctor.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedDoctorId === doctor.id
                            ? 'border-2 border-blue-600 bg-blue-50/50 shadow-md dark:bg-blue-950/20'
                            : 'border hover:border-blue-300'
                        }`}
                        onClick={() => handleDoctorChange(doctor.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="relative">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white shadow-sm">
                                {doctor.name
                                  .split(' ')
                                    .map((n: string) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </div>
                              {selectedDoctorId === doctor.id && (
                                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    Dr. {doctor.name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {doctor.specialty}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900/30">
                                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                    {doctor.rating.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                              {doctor.location && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                  <MapPin className="h-3 w-3" />
                                  {doctor.location}
                                </div>
                              )}
                            </div>

                            <ChevronRight
                              className={`h-5 w-5 transition-all ${
                                selectedDoctorId === doctor.id ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <User className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">No doctors found</p>
                      <p className="text-xs text-gray-400">Try adjusting your search</p>
                    </div>
                  )}
                </div>
                {errors.doctor && (
                  <p className="text-sm font-medium text-red-600">{errors.doctor.message}</p>
                )}
              </div>
            )}

            {/* Step 2: Select Date */}
            {step >= 2 && selectedDoctor && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Pick a Date</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(1)}
                      className="text-blue-600"
                    >
                      Change Doctor
                    </Button>
                  </div>

                  {/* Selected Doctor Chip */}
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {selectedDoctor.name
                        .split(' ')
                          .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        Dr. {selectedDoctor.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedDoctor.specialty}
                      </p>
                    </div>
                  </div>

                  {/* Date Grid */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {availableDates.map((date) => {
                      const isSelected = selectedDate === date.value;
                      const isToday = date.value === format(new Date(), 'yyyy-MM-dd');
                      return (
                        <button
                          key={date.value}
                          type="button"
                          onClick={() => handleDateChange(date.value)}
                          className={`group relative overflow-hidden rounded-lg border-2 p-3 text-center transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800'
                          }`}
                        >
                          {isToday && !isSelected && (
                            <div className="absolute right-1 top-1">
                              <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                            </div>
                          )}
                          <div className="text-xs font-medium opacity-75">
                            {date.label.split(',')[0]}
                          </div>
                          <div className="mt-1 text-lg font-bold">{date.label.split(' ')[2]}</div>
                          {isSelected && (
                            <CheckCircle2 className="absolute bottom-1 right-1 h-4 w-4" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {errors.date && (
                    <p className="text-sm font-medium text-red-600">{errors.date.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Select Time Slot */}
            {step >= 3 && selectedDate && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Choose Time Slot</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep(2)}
                      className="text-blue-600"
                    >
                      Change Date
                    </Button>
                  </div>

                  {loadingSlots ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="mt-2 text-sm text-gray-500">Loading available slots...</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                      {availableSlots.map((slot) => {
                        const slotValue = `${slot.start_time}-${slot.end_time}`;
                        const isSelected = selectedTimeSlot === slotValue;

                        // Convert 24h to 12h format
                        const formatTime12h = (time24: string) => {
                          const [hours, minutes] = time24.split(':');
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const hour12 = hour % 12 || 12;
                          return `${hour12}:${minutes} ${ampm}`;
                        };

                        return (
                          <button
                            key={slotValue}
                            type="button"
                            onClick={() => handleTimeSlotChange(slotValue)}
                            className={`group relative rounded-lg border-2 p-3 text-center font-semibold transition-all ${
                              isSelected
                                ? 'border-green-600 bg-green-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800'
                            }`}
                          >
                            <Clock
                              className={`mx-auto h-4 w-4 ${isSelected ? '' : 'text-gray-400'}`}
                            />
                            <div className="mt-1 text-sm">{formatTime12h(slot.start_time)}</div>
                            {isSelected && (
                              <CheckCircle2 className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white text-green-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:bg-gray-800/50">
                      <Clock className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-2 font-medium text-gray-600">No slots available</p>
                      <p className="text-sm text-gray-400">Please choose another date</p>
                    </div>
                  )}
                  {errors.time_slot && (
                    <p className="text-sm font-medium text-red-600">{errors.time_slot.message}</p>
                  )}
                </div>
              </>
            )}

            {/* Step 4: Notes */}
            {step >= 4 && selectedTimeSlot && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Additional Information</h3>

                  {/* Booking Summary */}
                  <Card className="border-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                    <CardContent className="p-4">
                      <h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        Your Appointment
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Doctor</span>
                          <span className="font-semibold">Dr. {selectedDoctor?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Date</span>
                          <span className="font-semibold">
                            {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Time</span>
                          <span className="font-semibold">
                            {(() => {
                              const time24 = selectedTimeSlot.split('-')[0];
                              const [hours, minutes] = time24.split(':');
                              const hour = parseInt(hours);
                              const ampm = hour >= 12 ? 'PM' : 'AM';
                              const hour12 = hour % 12 || 12;
                              return `${hour12}:${minutes} ${ampm}`;
                            })()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes for Doctor <span className="text-xs text-gray-500">(Optional)</span>
                    </Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Describe your symptoms, concerns, or reason for visit..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/10">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="consent"
                          checked={grantConsent}
                          onCheckedChange={(checked) => setGrantConsent(checked === true)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor="consent"
                            className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                          >
                            <Shield className="h-4 w-4 text-blue-600" />
                            Grant access to my medical records
                          </label>
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Allow Dr. {selectedDoctor?.name} to view your medical history during
                            your appointment. This helps provide better care. You can revoke access
                            anytime.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Footer Actions */}
            <div className="mt-6 space-y-3 border-t pt-6">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={bookMutation.isPending}
                >
                  Cancel
                </Button>
                {step < 4 ? (
                  <Button type="button" variant="outline" className="flex-1" disabled>
                    Complete all steps
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={bookMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {bookMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm Booking
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
