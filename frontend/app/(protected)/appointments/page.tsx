'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  XCircle,
  PauseCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
} from 'lucide-react';
import { BookingModal } from '@/features/scheduling/components/BookingModal';
import { apiClient } from '@/lib/api/axios';
import { useCurrentUser } from '@/features/auth/hooks';
import type { Appointment, AppointmentStatus, ServiceBooking } from '@/types/api';
import { format } from 'date-fns';

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDoctorBookModal, setShowDoctorBookModal] = useState(false);
  const [pastPage, setPastPage] = useState(1);
  const [canceledPage, setCanceledPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 5;
  const qc = useQueryClient();

  const { data: user } = useCurrentUser();
  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-open booking modal only for patients
  useEffect(() => {
    if (!mounted || isDoctor || !searchParams) return;
    const doctorId = searchParams.get('doctor');
    const openBook = searchParams.get('book') === '1' || searchParams.get('open') === 'book';
    if (doctorId || openBook) setShowBookingModal(true);
  }, [mounted, searchParams, isDoctor]);

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/scheduling/appointments/');
      return data;
    },
  });

  const { data: serviceBookingsRaw } = useQuery({
    queryKey: ['service-bookings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/service-providers/bookings/');
      return Array.isArray(data) ? data : data?.results || [];
    },
    enabled: !isDoctor,
  });

  const invalidateAfterChange = () => {
    qc.invalidateQueries({ queryKey: ['appointments'] });
    qc.invalidateQueries({ queryKey: ['service-bookings'] });
    qc.invalidateQueries({ queryKey: ['doctor', 'availability'] });
  };

  const cancelMutation = useMutation({
    mutationFn: async (apt: Appointment) => {
      if ((apt as any)._isServiceBooking) {
        await apiClient.patch(`/api/service-providers/bookings/${(apt as any)._serviceBookingId}/`, { status: 'canceled' });
      } else {
        await apiClient.patch(`/api/scheduling/appointments/${apt.id}/cancel/`);
      }
    },
    onSuccess: invalidateAfterChange,
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/api/scheduling/appointments/${id}/`, { status: 'done' });
    },
    onSuccess: invalidateAfterChange,
  });

  const holdMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/api/scheduling/appointments/${id}/`, { status: 'hold' });
    },
    onSuccess: invalidateAfterChange,
  });

  const freeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/scheduling/appointments/${id}/free/`);
    },
    onSuccess: invalidateAfterChange,
  });

  const deleteMutation = useMutation({
    mutationFn: async (apt: Appointment) => {
      if ((apt as any)._isServiceBooking) {
        await apiClient.delete(`/api/service-providers/bookings/${(apt as any)._serviceBookingId}/`);
      } else {
        await apiClient.delete(`/api/scheduling/appointments/${apt.id}/`);
      }
    },
    onSuccess: invalidateAfterChange,
  });

  const rawAppointments: Appointment[] = (() => {
    const doctorAppts: Appointment[] = Array.isArray(data) ? data : data?.results || [];
    if (isDoctor || !serviceBookingsRaw) return doctorAppts;

    // Map service bookings to Appointment shape for unified display
    const statusMap: Record<string, AppointmentStatus> = {
      pending: 'scheduled',
      confirmed: 'scheduled',
      completed: 'done',
      canceled: 'canceled',
      no_show: 'canceled',
    };
    const serviceAppts: Appointment[] = (serviceBookingsRaw as ServiceBooking[]).map((b) => ({
      id: b.id + 1000000, // offset to avoid id collision
      doctor: 0,
      patient: b.patient,
      doctor_name: b.organization_name,
      specialty: b.service_name,
      patient_name: b.patient_name,
      date: b.date,
      start_time: b.preferred_time || '00:00',
      end_time: b.preferred_time || '00:00',
      scheduled_at: b.created_at,
      status: statusMap[b.status] || 'scheduled',
      notes: b.notes || undefined,
      consent_granted: false,
      consent: null,
      created_at: b.created_at,
      _isServiceBooking: true,
      _originalStatus: b.status,
      _serviceBookingId: b.id,
    } as any));

    return [...doctorAppts, ...serviceAppts];
  })();

  const searchLower = searchQuery.toLowerCase().trim();
  const filteredRawAppointments = rawAppointments.filter((a) => {
    if (!searchLower) return true;
    if (isDoctor) {
      return (
        a.patient_name?.toLowerCase().includes(searchLower) ||
        a.patient_code?.toLowerCase().includes(searchLower)
      );
    } else {
      return (
        a.doctor_name?.toLowerCase().includes(searchLower) ||
        a.specialty?.toLowerCase().includes(searchLower)
      );
    }
  });

  const appointments = filteredRawAppointments.map((a) => {
    if (a.status === 'scheduled') {
      const now = new Date();
      // Service bookings with no specific time: expire after the date passes
      if ((a as any)._isServiceBooking && a.end_time === '00:00') {
        const endOfDay = new Date(`${a.date}T23:59:59`);
        if (now > endOfDay) {
          return { ...a, status: 'expired' as AppointmentStatus };
        }
        return a;
      }
      let endDateTime = new Date(`${a.date}T${a.end_time}`);
      // Cross-midnight: if end_time <= start_time, end is next day
      if (a.end_time <= a.start_time) {
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
      }
      if (now > endDateTime) {
        const hoursOver = (now.getTime() - endDateTime.getTime()) / (1000 * 60 * 60);
        if (hoursOver > 24) {
          return { ...a, status: 'expired' as AppointmentStatus };
        } else {
          return { ...a, _isMissed: true }; // Flag to show Hold option
        }
      }
    }
    return a;
  });

  const upcoming = appointments.filter((a) => a.status === 'scheduled' || a.status === 'hold');
  const past = appointments.filter((a) => a.status === 'done');
  const canceled = appointments.filter((a) => a.status === 'canceled' || a.status === 'expired');

  const statusColor = (s: string) => {
    if (s === 'scheduled')
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'done') return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    if (s === 'hold')
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (s === 'expired') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  const paginatedPast = past.slice((pastPage - 1) * ITEMS_PER_PAGE, pastPage * ITEMS_PER_PAGE);
  const totalPastPages = Math.ceil(past.length / ITEMS_PER_PAGE);

  const paginatedCanceled = canceled.slice(
    (canceledPage - 1) * ITEMS_PER_PAGE,
    canceledPage * ITEMS_PER_PAGE
  );
  const totalCanceledPages = Math.ceil(canceled.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Appointments</h1>
          <p className="text-muted-foreground">
            {isDoctor ? 'Patients booked with you' : 'Manage your medical appointments'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={isDoctor ? "Search by patient name or ID..." : "Search by doctor name..."}
              className="w-full pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Doctors do NOT book appointments — patients do */}
          {!isDoctor && (
            <Button onClick={() => setShowBookingModal(true)} size="lg" className="w-full sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Book Appointment
            </Button>
          )}
          {isDoctor && (
            <Button onClick={() => setShowDoctorBookModal(true)} size="lg" className="w-full sm:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              Book for Patient
            </Button>
          )}
        </div>
      </div>

      {/* Scheduled */}
      <Card>
        <CardHeader>
          <CardTitle>{isDoctor ? 'Scheduled' : 'Upcoming Appointments'}</CardTitle>
          <CardDescription>
            {upcoming.length} scheduled appointment{upcoming.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border p-4">
                  <div className="mb-2 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  isDoctor={isDoctor}
                  statusColor={statusColor(apt.status)}
                  onCancel={() => cancelMutation.mutate(apt)}
                  onComplete={isDoctor ? () => completeMutation.mutate(apt.id) : undefined}
                  onHold={
                    isDoctor && (apt as any)._isMissed && apt.status === 'scheduled'
                      ? () => holdMutation.mutate(apt.id)
                      : undefined
                  }
                  onFree={isDoctor ? () => freeMutation.mutate(apt.id) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">
                {isDoctor ? 'No patients have booked yet' : 'No upcoming appointments'}
              </p>
              {!isDoctor && (
                <Button onClick={() => setShowBookingModal(true)}>
                  Book Your First Appointment
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
            <CardDescription>{past.length} completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paginatedPast.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  isDoctor={isDoctor}
                  statusColor={statusColor(apt.status)}
                  dimmed
                />
              ))}
            </div>
            
            {totalPastPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPastPage((p) => Math.max(1, p - 1))}
                  disabled={pastPage === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pastPage} of {totalPastPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPastPage((p) => Math.min(totalPastPages, p + 1))}
                  disabled={pastPage === totalPastPages}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Canceled */}
      {canceled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Canceled</CardTitle>
            <CardDescription>{canceled.length} canceled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paginatedCanceled.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  isDoctor={isDoctor}
                  statusColor={statusColor(apt.status)}
                  dimmed
                  onDelete={apt.status === 'expired' ? () => deleteMutation.mutate(apt) : undefined}
                />
              ))}
            </div>

            {totalCanceledPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCanceledPage((p) => Math.max(1, p - 1))}
                  disabled={canceledPage === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {canceledPage} of {totalCanceledPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCanceledPage((p) => Math.min(totalCanceledPages, p + 1))}
                  disabled={canceledPage === totalCanceledPages}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Booking Modal — patients only */}
      {mounted && !isDoctor && (
        <BookingModal
          open={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          preselectedDoctorId={
            searchParams?.get('doctor') ? Number(searchParams.get('doctor')) : undefined
          }
        />
      )}

      {/* Doctor Book for Patient Modal */}
      {mounted && isDoctor && (
        <DoctorBookModal
          open={showDoctorBookModal}
          onClose={() => setShowDoctorBookModal(false)}
        />
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div className="p-8">Loading appointments...</div>}>
        <AppointmentsContent />
      </Suspense>
    </div>
  );
}

function AppointmentCard({
  appointment: apt,
  isDoctor,
  statusColor,
  dimmed = false,
  onCancel,
  onComplete,
  onHold,
  onFree,
  onDelete,
}: {
  appointment: Appointment;
  isDoctor: boolean;
  statusColor: string;
  dimmed?: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
  onHold?: () => void;
  onFree?: () => void;
  onDelete?: () => void;
}) {
  const isServiceBooking = (apt as any)._isServiceBooking;
  const personName = isDoctor
    ? apt.patient_name || 'Patient'
    : isServiceBooking
      ? apt.doctor_name || 'Service Provider'
      : `Dr. ${apt.doctor_name || 'Doctor'}`;

  const subtitle = isDoctor ? apt.patient_phone || '' : apt.specialty || '';

  const formatTime = (t: string) => {
    if (!t) return '';
    const [hours, minutes] = t.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return format(d, 'h:mm a');
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border p-4 hover:bg-accent/50 sm:flex-row sm:items-start sm:justify-between ${dimmed ? 'opacity-60' : ''}`}
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="shrink-0 rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{personName}</h3>
            {isServiceBooking && (
              <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                Service
              </Badge>
            )}
            {subtitle && (
              <Badge variant="outline" className="text-xs">
                {subtitle}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(apt.date), 'EEE, MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {isServiceBooking && apt.start_time === '00:00'
                ? 'Time to be confirmed'
                : `${formatTime(apt.start_time)} – ${formatTime(apt.end_time)}`}
            </span>
          </div>
          {apt.notes && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{apt.notes}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <Badge className={statusColor}>
          {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
        </Badge>
        {(apt.status === 'scheduled' || apt.status === 'hold') && (
          <div className="flex gap-1">
            {onComplete && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-green-300 text-xs text-green-600 hover:bg-green-50"
                onClick={onComplete}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Done
              </Button>
            )}
            {onHold && apt.status === 'scheduled' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-yellow-300 text-xs text-yellow-600 hover:bg-yellow-50"
                onClick={onHold}
              >
                <PauseCircle className="h-3.5 w-3.5" /> Hold
              </Button>
            )}
            {onCancel && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-red-300 text-xs text-red-600 hover:bg-red-50"
                onClick={onCancel}
              >
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </Button>
            )}
            {onFree && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-orange-300 text-xs text-orange-600 hover:bg-orange-50"
                onClick={onFree}
              >
                <Trash2 className="h-3.5 w-3.5" /> Free Slot
              </Button>
            )}
          </div>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-red-300 text-xs text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}

// ========================================
// Doctor Book for Patient Modal
// ========================================
interface BookingSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  past?: boolean;
}
interface BookingSession {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: 'expired' | 'running' | 'upcoming';
  total_slots: number;
  available_count: number;
  slots: BookingSlot[];
}

function DoctorBookModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [patientCode, setPatientCode] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; start: string; end: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const { data: user } = useCurrentUser();
  const doctorId = user?.doctor_profile?.id;

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<BookingSession[]>({
    queryKey: ['doctor', 'booking-slots'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/doctors/booking-slots/');
      return data;
    },
    enabled: open,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!doctorId || !selectedSlot) throw new Error('Missing data');
      const { data } = await apiClient.post('/api/scheduling/appointments/', {
        patient_code: patientCode.trim(),
        doctor: doctorId,
        date: selectedSlot.date,
        start_time: selectedSlot.start + ':00',
        end_time: selectedSlot.end + ':00',
        notes,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['doctor', 'booking-slots'] });
      setPatientCode('');
      setSelectedSlot(null);
      setNotes('');
      setError('');
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error
        || err?.response?.data?.detail
        || (err?.response?.data && typeof err.response.data === 'object' ? JSON.stringify(err.response.data) : null)
        || 'Failed to book appointment';
      setError(msg);
    },
  });

  if (!open) return null;

  const statusBadge = (s: string) => {
    if (s === 'expired') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (s === 'running') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const statusLabel = (s: string) => {
    if (s === 'expired') return 'Expired';
    if (s === 'running') return 'Currently Running';
    return 'Upcoming';
  };

  const formatSlotTime = (t: string) => {
    const [h, m] = t.split(':');
    const d = new Date();
    d.setHours(parseInt(h), parseInt(m));
    return format(d, 'h:mm a');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-background p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Book Appointment for Patient</h2>

        <div className="space-y-4">
          {/* Patient Code */}
          <div>
            <label className="mb-1 block text-sm font-medium">Patient Code</label>
            <Input
              placeholder="PT-XXXXXXXX"
              value={patientCode}
              onChange={(e) => setPatientCode(e.target.value)}
            />
          </div>

          {/* Sessions List */}
          <div>
            <label className="mb-2 block text-sm font-medium">Select a Slot from Your Sessions</label>
            {sessionsLoading ? (
              <p className="text-sm text-muted-foreground">Loading sessions...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No availability sessions found. Create one first.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {format(new Date(session.date + 'T00:00'), 'EEE, MMM d')} · {formatSlotTime(session.start_time)} – {formatSlotTime(session.end_time)}
                      </span>
                      <Badge className={statusBadge(session.status)}>
                        {statusLabel(session.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {session.available_count}/{session.total_slots} slots available
                    </p>
                    {session.status !== 'expired' && (
                      <div className="flex flex-wrap gap-1.5">
                        {session.slots.map((slot) => {
                          const isSelected = selectedSlot?.date === session.date && selectedSlot?.start === slot.start_time;
                          const isDisabled = !slot.available;
                          return (
                            <button
                              key={slot.start_time}
                              onClick={() => !isDisabled && setSelectedSlot({ date: session.date, start: slot.start_time, end: slot.end_time })}
                              disabled={isDisabled}
                              className={`rounded border px-2 py-1 text-xs transition-colors ${
                                isDisabled
                                  ? slot.past
                                    ? 'border-gray-200 bg-gray-100 text-gray-400 line-through cursor-not-allowed'
                                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : isSelected
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border hover:border-primary hover:bg-primary/10'
                              }`}
                            >
                              {formatSlotTime(slot.start_time)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {session.status === 'expired' && (
                      <p className="text-xs text-red-500">Session has expired</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected slot display */}
          {selectedSlot && (
            <div className="rounded border border-primary/30 bg-primary/5 p-2 text-sm">
              Selected: <strong>{format(new Date(selectedSlot.date + 'T00:00'), 'MMM d, yyyy')}</strong> at <strong>{formatSlotTime(selectedSlot.start)} – {formatSlotTime(selectedSlot.end)}</strong>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium">Notes (optional)</label>
            <Input
              placeholder="Reason for visit..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => bookMutation.mutate()}
              disabled={!patientCode || !selectedSlot || bookMutation.isPending}
            >
              {bookMutation.isPending ? 'Booking...' : 'Book Appointment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
