'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Calendar, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AppSidebarProps {
  isOpen: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Records', href: '/records', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppSidebar({ isOpen }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'border-r bg-white transition-all duration-300 dark:bg-gray-800',
        isOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      <nav className="flex flex-col gap-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
