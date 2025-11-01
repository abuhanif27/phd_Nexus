'use client';

import * as React from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        <AppSidebar isOpen={true} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader onToggleSidebar={() => {}} />
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 p-6 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <AppSidebar isOpen={sidebarOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 p-6 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
