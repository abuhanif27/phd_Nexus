'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { BookingModal } from '@/features/scheduling/components/BookingModal';
import { apiClient } from '@/lib/api/axios';
import { useCurrentUser } from '@/features/auth/hooks';
import type { Appointment, AppointmentStatus } from '@/types/api';
import { format } from 'date-fns';

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
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

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/api/scheduling/appointments/${id}/cancel/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/api/scheduling/appointments/${id}/`, { status: 'done' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const holdMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/api/scheduling/appointments/${id}/`, { status: 'hold' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const rawAppointments: Appointment[] = Array.isArray(data) ? data : data?.results || [];

  const searchLower = searchQuery.toLowerCase().trim();
  const filteredRawAppointments = rawAppointments.filter((a) => {
    if (!searchLower) return true;
    if (isDoctor) {
      return (
        a.patient_name?.toLowerCase().includes(searchLower) ||
        a.patient_code?.toLowerCase().includes(searchLower)
      );
    } else {
      return a.doctor_name?.toLowerCase().includes(searchLower);
    }
  });

  const appointments = filteredRawAppointments.map((a) => {
    if (a.status === 'scheduled') {
      const endDateTime = new Date(`${a.date}T${a.end_time}`);
      const now = new Date();
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
                  onCancel={() => cancelMutation.mutate(apt.id)}
                  onComplete={isDoctor ? () => completeMutation.mutate(apt.id) : undefined}
                  onHold={
                    isDoctor && (apt as any)._isMissed && apt.status === 'scheduled'
                      ? () => holdMutation.mutate(apt.id)
                      : undefined
                  }
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
}: {
  appointment: Appointment;
  isDoctor: boolean;
  statusColor: string;
  dimmed?: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
  onHold?: () => void;
}) {
  const personName = isDoctor
    ? apt.patient_name || 'Patient'
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
              {formatTime(apt.start_time)} – {formatTime(apt.end_time)}
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
          </div>
        )}
      </div>
    </div>
  );
}
