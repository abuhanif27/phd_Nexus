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
  const doctorId = searchParams?.get('doctor');
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Auto-open booking modal if doctor param exists
  useEffect(() => {
    if (doctorId) {
      setShowBookingModal(true);
    }
  }, [doctorId]);

  // Fetch appointments
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data } = await apiClient.get<Appointment[]>('/api/scheduling/appointments/');
      return data;
    },
  });

  const upcomingAppointments = appointments?.filter((apt) => apt.status === 'scheduled') || [];
  const pastAppointments = appointments?.filter((apt) => apt.status === 'done') || [];

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">Manage your medical appointments</p>
        </div>
        <Button onClick={() => setShowBookingModal(true)} size="lg">
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
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-start justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex gap-4">
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
              {pastAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-start justify-between rounded-lg border p-4 opacity-75"
                >
                  <div className="flex gap-4">
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
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
      <BookingModal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        preselectedDoctorId={doctorId ? Number(doctorId) : undefined}
      />
    </div>
  );
}
