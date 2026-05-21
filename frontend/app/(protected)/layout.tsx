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
  }, []);

  // Avoid hydration mismatch by always rendering AppShell initially
  if (!isClient) {
    return <AppShell>{children}</AppShell>;
  }

  if (!isAuthenticated()) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-500"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="space-y-2 max-w-md">
            <h1 className="text-3xl font-bold tracking-tight">Authentication Required</h1>
            <p className="text-muted-foreground">
              You need to be logged in to access this page. Please sign in or create an account to continue.
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-11 rounded-md px-8"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 rounded-md px-8"
            >
              Return Home
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
