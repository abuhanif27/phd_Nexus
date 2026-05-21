'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks';
import { getMyAppointments } from '@/features/scheduling/api';
import { getConsents } from '@/features/consent/api';
import { searchPatients } from '@/features/patients/api';
import {
  getDoctorPatientDocumentsByCode,
  summarizeDoctorPatientDocumentsByCode,
  type DoctorPatientDocumentsSummaryResponse,
} from '@/features/records/api';
import { requestAccessNotification } from '@/features/notifications/api';
import { requestBookingPermission } from '@/features/consent/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User,
  ShieldCheck,
  ShieldX,
  Calendar,
  Phone,
  CheckCircle2,
  Search,
  FileText,
  Pill,
} from 'lucide-react';
import Link from 'next/link';
import type { Appointment, Consent, Patient, PaginatedResponse, MedicalFile } from '@/types/api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import React from 'react';
import { PrescriptionGenerator } from '@/features/records/components/PrescriptionGenerator';
import { BookingModal } from '@/features/scheduling/components/BookingModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DoctorPatientsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [patientCodeQuery, setPatientCodeQuery] = useState<string>('');
  const [patientCodeResult, setPatientCodeResult] = useState<{
    patient: {
      id: number;
      patient_code: string;
      name: string;
      email?: string;
    };
    results: MedicalFile[];
  } | null>(null);
  const [patientCodeSummary, setPatientCodeSummary] =
    useState<DoctorPatientDocumentsSummaryResponse | null>(null);
  const [sentRequestPatientIds, setSentRequestPatientIds] = useState<Set<number>>(new Set());
  const [prescribePatient, setPrescribePatient] = useState<{ id: number; name: string } | null>(
    null
  );
  const [bookingPatient, setBookingPatient] = useState<{ id: number; name: string } | null>(
    null
  );
  const [sentBookingRequestIds, setSentBookingRequestIds] = useState<Set<number>>(new Set());

  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['doctor', 'appointments'],
    queryFn: () => getMyAppointments(),
    enabled: !!user && user.role === 'doctor',
  });

  const { data: consentsData, isLoading: consentsLoading } = useQuery<PaginatedResponse<Consent>>({
    queryKey: ['doctor', 'consents'],
    queryFn: () => getConsents(),
    enabled: !!user && user.role === 'doctor',
  });

  const { data: searchData, isLoading: searchLoading } = useQuery<PaginatedResponse<Patient>>({
    queryKey: ['doctor', 'patients-search', searchQuery],
    queryFn: () => searchPatients(searchQuery.trim()),
    enabled: !!user && user.role === 'doctor' && searchQuery.trim().length >= 2,
  });

  const requestAccessMutation = useMutation({
    mutationFn: ({ patientId, message }: { patientId: number; message: string }) =>
      requestAccessNotification(patientId, message),
    onSuccess: (_, variables) => {
      setSentRequestPatientIds((prev) => new Set([...prev, variables.patientId]));
      toast.success('Access request sent to patient');
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to send request';
      console.error('Error sending request:', errorMsg);
      toast.error(errorMsg);
    },
  });

  const requestBookingMutation = useMutation({
    mutationFn: (patientId: number) => requestBookingPermission(patientId),
    onSuccess: (_, patientId) => {
      setSentBookingRequestIds((prev) => new Set([...prev, patientId]));
      toast.success('Booking permission request sent to patient');
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to send booking request';
      toast.error(errorMsg);
    },
  });

  const patientDocsMutation = useMutation({
    mutationFn: (patientCode: string) => getDoctorPatientDocumentsByCode(patientCode),
    onSuccess: (data) => {
      setPatientCodeResult(data);
      setPatientCodeSummary(null);
      toast.success(`Found ${data.results.length} uploaded documents`);
    },
    onError: (error: any) => {
      setPatientCodeResult(null);
      setPatientCodeSummary(null);
      const errorMsg =
        error?.response?.data?.error ||
        error?.message ||
        'Failed to search documents by patient code';
      toast.error(errorMsg);
    },
  });

  const patientSummaryMutation = useMutation({
    mutationFn: (patientCode: string) => summarizeDoctorPatientDocumentsByCode(patientCode),
    onSuccess: (data) => {
      setPatientCodeSummary(data);
      toast.success('Document summary generated');
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.error || error?.message || 'Failed to summarize patient documents';
      toast.error(errorMsg);
    },
  });

  const appointments = useMemo(() => appointmentsData || [], [appointmentsData]);
  const consents = useMemo(() => consentsData?.results || [], [consentsData]);

  const { registeredPatients, unregisteredPatients, consentOnlyPatients } = useMemo(() => {
    const consentPatientIds = new Set(
      consents
        .filter((consent: Consent) => consent.status === 'active')
        .map((consent: Consent) => consent.patient)
    );

    // Track which patients have appointments
    const patientsWithAppointments = new Set<number>();
    const uniquePatients = new Map<number, Appointment>();

    for (const appointment of appointments) {
      patientsWithAppointments.add(appointment.patient);
      if (!uniquePatients.has(appointment.patient)) {
        uniquePatients.set(appointment.patient, appointment);
      }
    }

    const registered: Appointment[] = [];
    const unregistered: Appointment[] = [];

    // Separate appointments into registered/unregistered
    uniquePatients.forEach((appointment) => {
      if (consentPatientIds.has(appointment.patient)) {
        registered.push(appointment);
      } else {
        unregistered.push(appointment);
      }
    });

    // Find patients with consent but no appointments
    const consentOnly = consents
      .filter(
        (consent: Consent) =>
          consent.status === 'active' && !patientsWithAppointments.has(consent.patient)
      )
      .map((consent: Consent) => consent);

    return {
      registeredPatients: registered,
      unregisteredPatients: unregistered,
      consentOnlyPatients: consentOnly,
    };
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
  const hasPatients =
    registeredPatients.length > 0 ||
    unregisteredPatients.length > 0 ||
    consentOnlyPatients.length > 0;
  const searchResults = searchData?.results || [];

  const handlePatientCodeSearch = () => {
    const code = patientCodeQuery.trim().toUpperCase();
    if (!code) {
      toast.error('Enter a patient code');
      return;
    }
    patientDocsMutation.mutate(code);
  };

  const handlePatientCodeSummary = () => {
    const code = patientCodeQuery.trim().toUpperCase();
    if (!code) {
      toast.error('Enter a patient code');
      return;
    }
    patientSummaryMutation.mutate(code);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Patients</h1>
          <p className="text-muted-foreground">
            View your patients and their medical record access status
          </p>
        </div>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/appointments">View Appointments</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find a Patient</CardTitle>
          <CardDescription>Search by patient code, name, email, or phone</CardDescription>
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
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">{patient.email}</p>
                    {patient.patient_code && (
                      <p className="text-xs text-muted-foreground">Code: {patient.patient_code}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      requestAccessMutation.isPending || sentRequestPatientIds.has(patient.id)
                    }
                    onClick={() =>
                      handleRequestAccess({
                        patientId: patient.id,
                        patientName: patient.name,
                        appointmentDate: null,
                        requestAccess: requestAccessMutation.mutate,
                      })
                    }
                  >
                    {sentRequestPatientIds.has(patient.id) ? 'Request Sent' : 'Request Access'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Search Documents by Patient Code
          </CardTitle>
          <CardDescription>
            Doctor-only. Enter the unique patient code to open uploaded documents and summarize
            them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Example: PT-AB12CD34"
              value={patientCodeQuery}
              onChange={(e) => setPatientCodeQuery(e.target.value.toUpperCase())}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handlePatientCodeSearch}
              disabled={patientDocsMutation.isPending}
            >
              <Search className="mr-2 h-4 w-4" />
              {patientDocsMutation.isPending ? 'Searching...' : 'Search Documents'}
            </Button>
          </div>

          {patientCodeResult && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{patientCodeResult.patient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Code: {patientCodeResult.patient.patient_code}
                  </p>
                </div>
                <Badge variant="secondary">
                  {patientCodeResult.results.length} uploaded documents
                </Badge>
              </div>

              <div className="space-y-2">
                {patientCodeResult.results.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No uploaded documents found.</p>
                ) : (
                  patientCodeResult.results.map((file) => (
                    <div key={file.id} className="rounded-md border p-3">
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.kind} • {format(new Date(file.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handlePatientCodeSummary}
                  disabled={patientSummaryMutation.isPending}
                >
                  {patientSummaryMutation.isPending ? 'Summarizing...' : 'Summarize Documents'}
                </Button>
              </div>

              {patientCodeSummary && (
                <div className="space-y-3 rounded-md border bg-muted/20 p-4">
                  <p className="text-sm font-semibold">AI Summary</p>
                  <p className="text-sm text-muted-foreground">
                    {patientCodeSummary.summary || 'No summary available.'}
                  </p>
                  {patientCodeSummary.key_points.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Key points</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {patientCodeSummary.key_points.map((point, idx) => (
                          <li key={`${idx}-${point.slice(0, 20)}`}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
              {registeredPatients.length === 0 && consentOnlyPatients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No patients have granted access yet.
                </div>
              ) : (
                <>
                  {registeredPatients.map((appointment) => (
                    <PatientCard
                      key={appointment.patient}
                      appointment={appointment}
                      status="registered"
                      consents={consents}
                      onPrescribe={(id, name) => setPrescribePatient({ id, name })}
                      onBook={(id, name) => setBookingPatient({ id, name })}
                      onRequestBooking={(id) => requestBookingMutation.mutate(id)}
                      isBookingRequested={(id) => sentBookingRequestIds.has(id)}
                    />
                  ))}
                  {consentOnlyPatients.map((consent: Consent) => (
                    <ConsentOnlyPatientCard 
                      key={consent.patient} 
                      consent={consent} 
                      onPrescribe={(id, name) => setPrescribePatient({ id, name })}
                      onBook={(id, name) => setBookingPatient({ id, name })}
                      onRequestBooking={(id) => requestBookingMutation.mutate(id)}
                      isBookingRequested={(id) => sentBookingRequestIds.has(id)}
                    />
                  ))}
                </>
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
                    sentRequestPatientIds={sentRequestPatientIds}
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

      <Dialog open={!!prescribePatient} onOpenChange={(open) => !open && setPrescribePatient(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent">
          {prescribePatient && (
            <PrescriptionGenerator
              patientId={prescribePatient.id}
              patientName={prescribePatient.name}
              onSuccess={() => setPrescribePatient(null)}
              onCancel={() => setPrescribePatient(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <BookingModal
        open={!!bookingPatient}
        onClose={() => setBookingPatient(null)}
        preselectedPatientId={bookingPatient?.id}
        preselectedPatientName={bookingPatient?.name}
      />
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
}): void {
  const nextVisit = appointmentDate ? format(new Date(appointmentDate), 'MMM d, yyyy') : null;
  const message = nextVisit
    ? `Hi ${patientName}, please grant me access to your medical records for our appointment on ${nextVisit}. You can do this in your consent settings.`
    : `Hi ${patientName}, please grant me access to your medical records so I can review your history. You can do this in your consent settings.`;

  requestAccess({ patientId, message });
}

interface PatientCardProps {
  appointment: Appointment;
  status: 'registered' | 'unregistered';
  consents?: Consent[];
  onRequestAccess?: (appointment: Appointment) => void;
  onPrescribe?: (patientId: number, patientName: string) => void;
  onBook?: (patientId: number, patientName: string) => void;
  onRequestBooking?: (patientId: number) => void;
  isBookingRequested?: (patientId: number) => boolean;
  sentRequestPatientIds?: Set<number>;
}

function PatientCard({
  appointment,
  status,
  consents,
  onRequestAccess,
  onPrescribe,
  onBook,
  onRequestBooking,
  isBookingRequested,
  sentRequestPatientIds,
}: PatientCardProps): React.ReactElement {
  const patientName = appointment.patient_name || `Patient #${appointment.patient}`;
  const nextVisit = format(
    new Date(`${appointment.date}T${appointment.start_time}`),
    'MMM d, yyyy'
  );
  const hasRequestBeenSent = sentRequestPatientIds?.has(appointment.patient) || false;
  
  // Check if doctor has scheduling permission for this patient
  const hasSchedulingPermission = useMemo(() => {
    if (!consents) return false;
    const consent = consents.find(c => c.patient === appointment.patient && c.status === 'active');
    if (!consent) return false;
    const writeScope = consent.scope?.write || [];
    return writeScope.includes('scheduling') || writeScope.includes('appointments') || writeScope.includes('*');
  }, [consents, appointment.patient]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
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
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {status === 'unregistered' && onRequestAccess && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRequestAccess(appointment)}
            disabled={hasRequestBeenSent}
          >
            {hasRequestBeenSent ? 'Request Sent' : 'Request Access'}
          </Button>
        )}
        <Badge variant={status === 'registered' ? 'default' : 'secondary'}>
          {status === 'registered' ? 'Access Granted' : 'No Access'}
        </Badge>
        {status === 'registered' && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/patients/${appointment.patient}`}>View Records</Link>
          </Button>
        )}
        {status === 'registered' && onBook && (
          hasSchedulingPermission ? (
            <Button size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => onBook(appointment.patient, patientName)}>
              <Calendar className="mr-2 h-4 w-4" />
              Book
            </Button>
          ) : (
            onRequestBooking && (
              <Button size="sm" variant="outline" className="border-purple-100 text-purple-500" 
                onClick={() => onRequestBooking(appointment.patient)}
                disabled={isBookingRequested?.(appointment.patient)}
              >
                {isBookingRequested?.(appointment.patient) ? 'Booking Requested' : 'Enable Booking'}
              </Button>
            )
          )
        )}
        {status === 'registered' && onPrescribe && (
          <Button size="sm" onClick={() => onPrescribe(appointment.patient, patientName)}>
            <Pill className="mr-2 h-4 w-4" />
            Prescribe
          </Button>
        )}
      </div>
    </div>
  );
}

interface ConsentOnlyPatientCardProps {
  consent: Consent;
  onPrescribe?: (patientId: number, patientName: string) => void;
  onBook?: (patientId: number, patientName: string) => void;
  onRequestBooking?: (patientId: number) => void;
  isBookingRequested?: (patientId: number) => boolean;
}

function ConsentOnlyPatientCard({ 
  consent, 
  onPrescribe,
  onBook,
  onRequestBooking,
  isBookingRequested
}: ConsentOnlyPatientCardProps): React.ReactElement {
  const expiresAt = format(new Date(consent.expires_at), 'MMM d, yyyy h:mm a');
  const patientName = `Patient #${consent.patient}`;
  
  const hasSchedulingPermission = useMemo(() => {
    const writeScope = consent.scope?.write || [];
    return writeScope.includes('scheduling') || writeScope.includes('appointments') || writeScope.includes('*');
  }, [consent]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <User className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold">Patient #{consent.patient}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Access granted (no appointments yet)
            </span>
            <span>Expires: {expiresAt}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Badge variant="default">Access Granted</Badge>
        <Button asChild size="sm" variant="outline">
          <Link href={`/patients/${consent.patient}`}>View Records</Link>
        </Button>
        {onBook && (
          hasSchedulingPermission ? (
            <Button size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => onBook(consent.patient, patientName)}>
              <Calendar className="mr-2 h-4 w-4" />
              Book
            </Button>
          ) : (
            onRequestBooking && (
              <Button size="sm" variant="outline" className="border-purple-100 text-purple-500" 
                onClick={() => onRequestBooking(consent.patient)}
                disabled={isBookingRequested?.(consent.patient)}
              >
                {isBookingRequested?.(consent.patient) ? 'Booking Requested' : 'Enable Booking'}
              </Button>
            )
          )
        )}
        {onPrescribe && (
          <Button size="sm" onClick={() => onPrescribe(consent.patient, patientName)}>
            <Pill className="mr-2 h-4 w-4" />
            Prescribe
          </Button>
        )}
      </div>
    </div>
  );
}
