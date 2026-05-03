'use client';

import { useCurrentUser } from '@/features/auth/hooks';
import { AvailabilityManager } from '@/features/doctors/components/AvailabilityManager';
import { redirect } from 'next/navigation';

export default function DashboardAvailabilityPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return null;

  if (user?.role !== 'doctor') {
    redirect('/dashboard');
  }

  return <AvailabilityManager />;
}
