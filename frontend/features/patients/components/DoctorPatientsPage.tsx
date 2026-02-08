'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks';
import { getMyAppointments } from '@/features/scheduling/api';
import { getConsents } from '@/features/consent/api';
import { searchPatients } from '@/features/patients/api';
import { requestAccessNotification } from '@/features/notifications/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, ShieldCheck, ShieldX, Calendar, Phone } from 'lucide-react';
import Link from 'next/link';
import type { Appointment, Consent, Patient } from '@/types/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function DoctorPatientsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');

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

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['doctor', 'patients-search', searchQuery],
    queryFn: () => searchPatients(searchQuery.trim()),
    enabled: !!user && user.role === 'doctor' && searchQuery.trim().length >= 2,
  });

  const requestAccessMutation = useMutation({
    mutationFn: ({ patientId, message }: { patientId: number; message: string }) =>
      requestAccessNotification(patientId, message),
    onSuccess: () => {
      toast.success('Access request sent');
    },
    onError: () => {
      toast.error('Failed to send request');
    },
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
  const searchResults = searchData?.results || [];

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

      <Card>
        <CardHeader>
          <CardTitle>Find a Patient</CardTitle>
          <CardDescription>Search by name, email, or phone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery.trim().length < 2 ? (
            <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
          ) : searchLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : searchResults.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No patients found.
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((patient: Patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.email}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={requestAccessMutation.isPending}
                    onClick={() =>
                      handleRequestAccess({
                        patientId: patient.id,
                        patientName: patient.name,
                        appointmentDate: null,
                        requestAccess: requestAccessMutation.mutate,
                      })
                    }
                  >
                    Request Access
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                    onRequestAccess={(appt) =>
                      handleRequestAccess({
                        patientId: appt.patient,
                        patientName: appt.patient_name || `Patient #${appt.patient}`,
                        appointmentDate: `${appt.date}T${appt.start_time}`,
                        requestAccess: requestAccessMutation.mutate,
                      })
                    }
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

function handleRequestAccess({
  patientId,
  patientName,
  appointmentDate,
  requestAccess,
}: {
  patientId: number;
  patientName: string;
  appointmentDate: string | null;
  requestAccess: (params: { patientId: number; message: string }) => void;
}) {
  const nextVisit = appointmentDate ? format(new Date(appointmentDate), 'MMM d, yyyy') : null;
  const message = nextVisit
    ? `Hi ${patientName}, please grant me access to your medical records for our appointment on ${nextVisit}. You can do this in your consent settings.`
    : `Hi ${patientName}, please grant me access to your medical records so I can review your history. You can do this in your consent settings.`;

  requestAccess({ patientId, message });
}

function PatientCard({
  appointment,
  status,
  onRequestAccess,
  requestDisabled,
}: {
  appointment: Appointment;
  status: 'registered' | 'unregistered';
  onRequestAccess?: (appointment: Appointment) => void;
  requestDisabled?: boolean;
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
      <div className="flex items-center gap-3">
        {status === 'unregistered' && onRequestAccess && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRequestAccess(appointment)}
            disabled={requestDisabled}
          >
            Request Access
          </Button>
        )}
        <Badge variant={status === 'registered' ? 'default' : 'secondary'}>
          {status === 'registered' ? 'Access Granted' : 'No Access'}
        </Badge>
      </div>
    </div>
  );
}
