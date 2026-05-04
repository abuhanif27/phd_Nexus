'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { BookingModal } from '@/features/scheduling/components/BookingModal';
import { apiClient } from '@/lib/api/axios';
import { useCurrentUser } from '@/features/auth/hooks';
import type { Appointment } from '@/types/api';
import { format } from 'date-fns';

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const qc = useQueryClient();

  const { data: user } = useCurrentUser();
  const isDoctor = user?.role === 'doctor';

  useEffect(() => { setMounted(true); }, []);

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

  const appointments: Appointment[] = Array.isArray(data) ? data : data?.results || [];
  const upcoming = appointments.filter((a) => a.status === 'scheduled');
  const past = appointments.filter((a) => a.status === 'done');
  const canceled = appointments.filter((a) => a.status === 'canceled');

  const statusColor = (s: string) => {
    if (s === 'scheduled') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (s === 'done') return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

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
        {/* Doctors do NOT book appointments — patients do */}
        {!isDoctor && (
          <Button onClick={() => setShowBookingModal(true)} size="lg" className="w-full sm:w-auto">
            <Plus className="mr-2 h-5 w-5" />
            Book Appointment
          </Button>
        )}
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
                <Button onClick={() => setShowBookingModal(true)}>Book Your First Appointment</Button>
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
              {past.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} isDoctor={isDoctor} statusColor={statusColor(apt.status)} dimmed />
              ))}
            </div>
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
              {canceled.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} isDoctor={isDoctor} statusColor={statusColor(apt.status)} dimmed />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Modal — patients only */}
      {mounted && !isDoctor && (
        <BookingModal
          open={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          preselectedDoctorId={searchParams?.get('doctor') ? Number(searchParams.get('doctor')) : undefined}
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
}: {
  appointment: Appointment;
  isDoctor: boolean;
  statusColor: string;
  dimmed?: boolean;
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  const personName = isDoctor
    ? apt.patient_name || 'Patient'
    : `Dr. ${apt.doctor_name || 'Doctor'}`;

  const subtitle = isDoctor
    ? apt.patient_phone || ''
    : apt.specialty || '';

  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-4 hover:bg-accent/50 sm:flex-row sm:items-start sm:justify-between ${dimmed ? 'opacity-60' : ''}`}>
      <div className="flex gap-3 sm:gap-4">
        <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30 shrink-0">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{personName}</h3>
            {subtitle && <Badge variant="outline" className="text-xs">{subtitle}</Badge>}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(apt.date), 'EEE, MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {apt.start_time} – {apt.end_time}
            </span>
          </div>
          {apt.notes && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{apt.notes}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <Badge className={statusColor}>{apt.status}</Badge>
        {apt.status === 'scheduled' && (
          <div className="flex gap-1">
            {onComplete && (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-green-600 border-green-300 hover:bg-green-50" onClick={onComplete}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Done
              </Button>
            )}
            {onCancel && (
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-red-600 border-red-300 hover:bg-red-50" onClick={onCancel}>
                <XCircle className="h-3.5 w-3.5" /> Cancel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
