'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth/session';
import { AppShell } from '@/components/app-shell/AppShell';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Avoid hydration mismatch by always rendering AppShell initially
  if (!isClient) {
    return <AppShell>{children}</AppShell>;
  }

  if (!isAuthenticated()) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
