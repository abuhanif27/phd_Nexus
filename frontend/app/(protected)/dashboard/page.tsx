'use client';

import { useCurrentUser } from '@/features/auth/hooks';
import { PatientDashboard } from '@/features/patients/components/PatientDashboard';
import { DoctorDashboard } from '@/features/doctors/components/DoctorDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  if (user?.role === 'patient') {
    return <PatientDashboard />;
  }

  if (user?.role === 'doctor') {
    return <DoctorDashboard />;
  }

  // TODO: Implement AdminDashboard
  // Fallback for admin or unknown roles
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.email}!</p>
      </div>
      <p>Dashboard for role: {user.role}</p>
    </div>
  );
}
