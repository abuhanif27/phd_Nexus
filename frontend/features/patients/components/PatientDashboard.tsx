'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, FileText, Activity, Pill, TrendingUp, Clock, AlertCircle, Search, Building2, MessageSquare } from 'lucide-react';
import { getDashboardStats, getMyAppointments } from '../api';
import { serviceProvidersApi } from '@/features/service-providers/api';
import { getHealthInsights } from '@/features/health-summary/api';
import { createConversation } from '@/features/chat/api';
import type { Appointment, ServiceBooking } from '@/types/api';
import { format, parseISO, isAfter, isSameDay } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

/**
 * Patient Dashboard - Shows overview of appointments, records, and health stats
 */
export function PatientDashboard() {
  const router = useRouter();
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['patient', 'dashboard', 'stats'],
    queryFn: getDashboardStats,
  });

  // Fetch appointments
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['patient', 'appointments', 'upcoming'],
    queryFn: () => getMyAppointments('scheduled'),
  });

  // Fetch AI health insights
  const { data: insightsData, isLoading: insightsLoading } = useQuery({
    queryKey: ['health', 'insights'],
    queryFn: getHealthInsights,
  });

  // Fetch Service Bookings
  const { data: serviceBookings, isLoading: serviceBookingsLoading } = useQuery({
    queryKey: ['patient', 'service-bookings'],
    queryFn: () => serviceProvidersApi.listBookings(),
  });

  // Filter for truly upcoming appointments (today or future)
  const upcomingAppointments = React.useMemo(() => {
    const results = appointmentsData?.results || [];
    const now = new Date();
    const doctorAppts = results
      .filter((appointment) => {
        const appointmentDate = parseISO(appointment.date);
        return isAfter(appointmentDate, now) || isSameDay(appointmentDate, now);
      });

    // Include upcoming service bookings as appointment-like entries
    const serviceAppts: Appointment[] = (serviceBookings || [])
      .filter(b => b.status !== 'completed' && b.status !== 'canceled')
      .filter(b => {
        const d = parseISO(b.date);
        return isAfter(d, now) || isSameDay(d, now);
      })
      .map(b => ({
        id: b.id + 1000000,
        doctor: 0,
        patient: b.patient,
        doctor_name: b.organization_name,
        specialty: b.service_name,
        patient_name: b.patient_name,
        date: b.date,
        start_time: b.preferred_time || '00:00',
        end_time: b.preferred_time || '00:00',
        scheduled_at: b.created_at,
        status: 'scheduled' as const,
        consent_granted: false,
        consent: null,
        created_at: b.created_at,
        _isServiceBooking: true,
      } as any));

    return [...doctorAppts, ...serviceAppts]
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [appointmentsData, serviceBookings]);

  const insights = insightsData?.insights || [];

  const upcomingServiceBookings = React.useMemo(() => {
    const results = serviceBookings || [];
    return results
      .filter(b => b.status !== 'completed' && b.status !== 'canceled')
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [serviceBookings]);

  const handleMessage = async (userId: number) => {
    try {
      const response = await createConversation(userId);
      const conversationId = response.id;
      router.push(`/messages?id=${conversationId}`);
    } catch (error) {
      console.error('Failed to initiate conversation:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your health overview.</p>
        </div>
        <Button asChild>
          <Link href="/doctors">
            <Search className="mr-2 h-4 w-4" />
            Explore Doctors
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Upcoming Appointments"
          value={(stats?.upcoming_appointments ?? 0) + (upcomingServiceBookings?.length ?? 0)}
          icon={Calendar}
          loading={statsLoading}
          href="/appointments"
        />
        <StatCard
          title="Medical Records"
          value={stats?.total_records}
          icon={FileText}
          loading={statsLoading}
          href="/dashboard/records"
        />
        <StatCard
          title="Recent Lab Results"
          value={stats?.recent_labs}
          icon={Activity}
          loading={statsLoading}
          href="/dashboard/records?filter=lab"
        />
        <StatCard
          title="Active Prescriptions"
          value={stats?.active_prescriptions}
          icon={Pill}
          loading={statsLoading}
          href="/dashboard/records?filter=prescription"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upcoming Appointments</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/appointments">View All</Link>
              </Button>
            </CardTitle>
            <CardDescription>Your scheduled medical appointments</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No upcoming appointments</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/doctors">Explore Doctors and Book</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.slice(0, 3).map((appointment) => (
                  <AppointmentCard 
                    key={appointment.id} 
                    appointment={appointment} 
                    onMessage={() => appointment.doctor_user_id && handleMessage(appointment.doctor_user_id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hospital Service Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Hospital Service Bookings</span>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/services">Book New</Link>
              </Button>
            </CardTitle>
            <CardDescription>Diagnostic tests and medical packages</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceBookingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : upcomingServiceBookings.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Building2 className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No service bookings found</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/services">Browse Medical Services</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingServiceBookings.slice(0, 3).map((booking) => (
                  <ServiceBookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onMessage={() => handleMessage(booking.organization_user_id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and features</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <QuickActionButton
              icon={Search}
              label="Explore Doctors"
              description="Find specialists and book visits"
              href="/doctors"
            />
            <QuickActionButton
              icon={FileText}
              label="Upload Records"
              description="Add lab results or documents"
              href="/dashboard/records/upload"
            />
            <QuickActionButton
              icon={Activity}
              label="View Lab Results"
              description="Check your latest test results"
              href="/dashboard/records?filter=lab"
            />
            <QuickActionButton
              icon={TrendingUp}
              label="Health Insights"
              description="AI-powered report summary"
              href="/health-summary"            />
          </CardContent>
        </Card>
      </div>

      {/* Health Insights Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            AI Health Insights
          </CardTitle>
          <CardDescription>Personalized health recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insightsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : insights.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Add more medical records to see personalized AI insights here.
              </p>
            ) : (
              insights.slice(0, 3).map((insight, idx) => (
                <InsightItem 
                  key={idx} 
                  type={idx % 3 === 0 ? "success" : idx % 3 === 1 ? "info" : "warning"} 
                  text={insight} 
                />
              ))
            )}
          </div>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link href="/health-summary">View Detailed Summary</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ========================================
// Component: StatCard
// ========================================
function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  href,
}: {
  title: string;
  value?: number;
  icon: React.ElementType;
  loading: boolean;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold">{value ?? 0}</div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ========================================
// Component: AppointmentCard
// ========================================
function AppointmentCard({ appointment, onMessage }: { appointment: Appointment; onMessage: () => void }) {
  const appointmentDate = parseISO(appointment.date);
  const isServiceBooking = (appointment as any)._isServiceBooking;
  const doctorName = appointment.doctor_name;
  const specialty = appointment.specialty;

  return (
    <div className="group relative">
      <Link href={isServiceBooking ? '/appointments' : `/dashboard/appointments/${appointment.id}`}>
        <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent pr-12">
          <div className="flex-shrink-0">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isServiceBooking ? 'bg-blue-500/10' : 'bg-primary/10'}`}>
              {isServiceBooking ? <Building2 className="h-6 w-6 text-blue-600" /> : <Calendar className="h-6 w-6 text-primary" />}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{isServiceBooking ? (doctorName || 'Service Provider') : (doctorName ? `Dr. ${doctorName}` : 'Doctor Appointment')}</p>
              {isServiceBooking && <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">Service</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{specialty}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(appointmentDate, 'MMM d, yyyy')}{appointment.start_time && appointment.start_time !== '00:00' ? ` at ${appointment.start_time}` : ''}
            </div>
          </div>
        </div>
      </Link>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.preventDefault();
          onMessage();
        }}
        title="Message Doctor"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ========================================
// Component: ServiceBookingCard
// ========================================
function ServiceBookingCard({ booking, onMessage }: { booking: ServiceBooking; onMessage: () => void }) {
  const bookingDate = parseISO(booking.date);

  return (
    <div className="group relative">
      <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent pr-12">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600">
            <Activity className="h-6 w-6" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold truncate">{booking.service_name}</p>
            <Badge variant={booking.status === 'confirmed' ? 'default' : 'outline'} className="text-[10px] uppercase">
              {booking.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{booking.organization_name}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(bookingDate, 'MMM d, yyyy')} {booking.preferred_time ? `at ${booking.preferred_time.substring(0, 5)}` : ''}
          </div>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onMessage}
        title="Message Hospital"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ========================================
// Component: QuickActionButton
// ========================================
function QuickActionButton({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-accent">
        <div className="flex-shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

// ========================================
// Component: InsightItem
// ========================================
function InsightItem({ type, text }: { type: 'info' | 'warning' | 'success'; text: string }) {
  const icons = {
    info: AlertCircle,
    warning: AlertCircle,
    success: Activity,
  };

  const colors = {
    info: 'text-blue-600',
    warning: 'text-yellow-600',
    success: 'text-green-600',
  };

  const Icon = icons[type];

  return (
    <div className="flex items-start gap-3">
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${colors[type]}`} />
      <p className="text-sm">{text}</p>
    </div>
  );
}
