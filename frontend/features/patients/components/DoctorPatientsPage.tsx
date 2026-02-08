'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks';
import { getMyAppointments } from '@/features/scheduling/api';
import { getConsents } from '@/features/consent/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { User, ShieldCheck, ShieldX, Calendar, Phone } from 'lucide-react';
import Link from 'next/link';
import type { Appointment, Consent } from '@/types/api';
import { format } from 'date-fns';

export function DoctorPatientsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();

  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['doctor', 'appointments'],
    queryFn: () => getMyAppointments(),
    enabled: !!user && user.role === 'doctor',
  });

  const { data: consentsData, isLoading: consentsLoading } = useQuery({
    queryKey: ['doctor', 'consents'],
    queryFn: () => getConsents(),
    enabled: !!user && user.role === 'doctor',
  });

  const appointments = Array.isArray(appointmentsData)
    ? appointmentsData
    : appointmentsData?.results || [];
  const consents = consentsData?.results || [];

  const { registeredPatients, unregisteredPatients } = useMemo(() => {
    const consentPatientIds = new Set(
      consents
        .filter((consent: Consent) => consent.status === 'active')
        .map((consent: Consent) => consent.patient)
    );

    const uniquePatients = new Map<number, Appointment>();
    for (const appointment of appointments) {
      if (!uniquePatients.has(appointment.patient)) {
        uniquePatients.set(appointment.patient, appointment);
      }
    }

    const registered: Appointment[] = [];
    const unregistered: Appointment[] = [];

    uniquePatients.forEach((appointment) => {
      if (consentPatientIds.has(appointment.patient)) {
        registered.push(appointment);
      } else {
        unregistered.push(appointment);
      }
    });

    return { registeredPatients: registered, unregisteredPatients: unregistered };
  }, [appointments, consents]);

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user || user.role !== 'doctor') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
          <CardDescription>This page is available to doctors only.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isLoading = appointmentsLoading || consentsLoading;
  const hasPatients = registeredPatients.length > 0 || unregisteredPatients.length > 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            View your patients and their medical record access status
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/appointments">View Appointments</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !hasPatients ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No patients yet</CardTitle>
            <CardDescription>
              Patients will appear here once they book appointments with you.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-green-600" />
                Registered (Access Granted)
              </CardTitle>
              <CardDescription>
                Patients who granted you access to their medical records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {registeredPatients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No patients have granted access yet.
                </div>
              ) : (
                registeredPatients.map((appointment) => (
                  <PatientCard
                    key={appointment.patient}
                    appointment={appointment}
                    status="registered"
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldX className="h-5 w-5 text-orange-600" />
                Not Registered (No Access)
              </CardTitle>
              <CardDescription>
                Patients who booked appointments but have not granted record access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unregisteredPatients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  All patients have granted access.
                </div>
              ) : (
                unregisteredPatients.map((appointment) => (
                  <PatientCard
                    key={appointment.patient}
                    appointment={appointment}
                    status="unregistered"
                  />
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function PatientCard({
  appointment,
  status,
}: {
  appointment: Appointment;
  status: 'registered' | 'unregistered';
}) {
  const patientName = appointment.patient_name || `Patient #${appointment.patient}`;
  const nextVisit = format(
    new Date(`${appointment.date}T${appointment.start_time}`),
    'MMM d, yyyy'
  );

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold">{patientName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Next visit: {nextVisit}
            </span>
            {appointment.patient_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {appointment.patient_phone}
              </span>
            )}
          </div>
        </div>
      </div>
      <Badge variant={status === 'registered' ? 'default' : 'secondary'}>
        {status === 'registered' ? 'Access Granted' : 'No Access'}
      </Badge>
    </div>
  );
}
