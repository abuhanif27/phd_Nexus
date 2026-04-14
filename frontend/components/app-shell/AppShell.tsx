'use client';

import * as React from 'react';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const syncSidebar = () => setSidebarOpen(media.matches);

    syncSidebar();
    media.addEventListener('change', syncSidebar);

    return () => media.removeEventListener('change', syncSidebar);
  }, []);

  return (
    <div
      className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950"
      suppressHydrationWarning
    >
      <AppSidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main
          className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 p-4 sm:p-5 lg:p-6 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900"
          suppressHydrationWarning
        >
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
