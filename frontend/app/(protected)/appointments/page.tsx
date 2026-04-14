'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, Plus } from 'lucide-react';
import { BookingModal } from '@/features/scheduling/components/BookingModal';
import { apiClient } from '@/lib/api/axios';
import type { Appointment } from '@/types/api';
import { format } from 'date-fns';

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const shouldOpenBookingModal =
    searchParams?.get('book') === '1' || searchParams?.get('open') === 'book';

  // Handle client-side mounting to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-open booking modal if doctor param exists
  useEffect(() => {
    if (mounted && searchParams) {
      const doctorId = searchParams.get('doctor');
      if (doctorId || shouldOpenBookingModal) {
        setShowBookingModal(true);
      }
    }
  }, [mounted, searchParams, shouldOpenBookingModal]);

  // Fetch appointments
  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/scheduling/appointments/');
      return data;
    },
  });

  // Handle both array and paginated response
  const appointments = Array.isArray(data) ? data : data?.results || [];
  const upcomingAppointments = appointments.filter(
    (apt: Appointment) => apt.status === 'scheduled'
  );
  const pastAppointments = appointments.filter((apt: Appointment) => apt.status === 'done');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'done':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Appointments</h1>
          <p className="text-muted-foreground">Manage your medical appointments</p>
        </div>
        <Button onClick={() => setShowBookingModal(true)} size="lg" className="w-full sm:w-auto">
          <Plus className="mr-2 h-5 w-5" />
          Book Appointment
        </Button>
      </div>

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>
            {upcomingAppointments.length} scheduled appointment
            {upcomingAppointments.length !== 1 ? 's' : ''}
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
          ) : upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          Dr. {appointment.doctor_details?.name || 'Doctor'}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {appointment.doctor_details?.specialty}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(appointment.date), 'EEE, MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {appointment.start_time} - {appointment.end_time}
                        </div>
                        {appointment.doctor_details?.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {appointment.doctor_details.location}
                          </div>
                        )}
                      </div>
                      {appointment.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">{appointment.notes}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="mb-4 text-muted-foreground">No upcoming appointments</p>
              <Button onClick={() => setShowBookingModal(true)}>Book Your First Appointment</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Appointments</CardTitle>
            <CardDescription>{pastAppointments.length} completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastAppointments.map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 opacity-75 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          Dr. {appointment.doctor_details?.name || 'Doctor'}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {appointment.doctor_details?.specialty}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(appointment.date), 'EEE, MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {appointment.start_time}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Modal */}
      {mounted && (
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
