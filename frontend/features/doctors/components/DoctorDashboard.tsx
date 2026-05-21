'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { getDashboardStats, getMyAppointments } from '../api';
import type { Appointment } from '@/types/api';
import { format } from 'date-fns';
import Link from 'next/link';

/**
 * Doctor Dashboard - Shows today's appointments, patients, and schedule
 */
export function DoctorDashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['doctor', 'dashboard', 'stats'],
    queryFn: getDashboardStats,
  });

  // Fetch today's appointments
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['doctor', 'appointments', 'today'],
    queryFn: () => getMyAppointments({ date: today, status: 'scheduled' }),
  });

  const todayAppointments = appointmentsData?.results || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctor Dashboard</h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/availability">
              <Settings className="mr-2 h-4 w-4" />
              Manage Availability
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/appointments">
              <Calendar className="mr-2 h-4 w-4" />
              View Schedule
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Appointments"
          value={stats?.today_appointments}
          icon={Calendar}
          loading={statsLoading}
          trend="neutral"
        />
        <StatCard
          title="Total Patients"
          value={stats?.total_patients}
          icon={Users}
          loading={statsLoading}
          trend="up"
        />
        <StatCard
          title="Upcoming This Week"
          value={stats?.upcoming_appointments}
          icon={Clock}
          loading={statsLoading}
          trend="neutral"
        />
        <StatCard
          title="Completed Today"
          value={stats?.completed_today}
          icon={CheckCircle2}
          loading={statsLoading}
          trend="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Schedule - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Today's Schedule</span>
              <Badge variant="outline">{todayAppointments.length} appointments</Badge>
            </CardTitle>
            <CardDescription>Your appointments for today</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p className="font-medium">No appointments today</p>
                <p className="mt-1 text-sm">Enjoy your day off!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((appointment) => (
                  <DoctorAppointmentCard key={appointment.id} appointment={appointment} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats & Actions */}
        <div className="space-y-6">
          {/* Performance Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Appointments</span>
                <span className="font-semibold">{stats?.upcoming_appointments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-semibold">{stats?.completed_today || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Patients Seen</span>
                <span className="font-semibold">{stats?.total_patients || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/patients">
                  <Users className="mr-2 h-4 w-4" />
                  View All Patients
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/availability">
                  <Settings className="mr-2 h-4 w-4" />
                  Update Availability
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/analytics">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alerts & Notifications */}
      {todayAppointments.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              • You have {todayAppointments.length} appointment
              {todayAppointments.length > 1 ? 's' : ''} scheduled for today
            </p>
            <p>• Remember to update patient records after each consultation</p>
            <p>• Check for any pending lab results that need review</p>
          </CardContent>
        </Card>
      )}
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
  trend,
}: {
  title: string;
  value?: number;
  icon: React.ElementType;
  loading: boolean;
  trend: 'up' | 'down' | 'neutral' | 'success';
}) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground',
    success: 'text-emerald-600',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${trendColors[trend]}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// Component: DoctorAppointmentCard
// ========================================
function DoctorAppointmentCard({ appointment }: { appointment: Appointment }) {
  const patientName = appointment.patient_name;
  const startTime = appointment.start_time;
  const endTime = appointment.end_time;

  return (
    <Link href={`/dashboard/appointments/${appointment.id}`}>
      <div className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent">
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{patientName || 'Patient'}</p>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {startTime} - {endTime}
              </div>
            </div>
            <Badge variant="outline">{appointment.status}</Badge>
          </div>
          {appointment.notes && (
            <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{appointment.notes}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
