'use client';

import { useCurrentUser } from '@/features/auth/hooks';
import { PatientDashboard } from '@/features/patients/components/PatientDashboard';
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

  // For now, show patient dashboard for all users
  // In production, you'd switch based on user.role
  if (user?.role === 'patient' || !user?.role) {
    return <PatientDashboard />;
  }

  // TODO: Implement DoctorDashboard and AdminDashboard
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
