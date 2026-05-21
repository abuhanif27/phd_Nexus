'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Activity,
  Users,
  Stethoscope,
  Settings,
  Sparkles,
  Building2,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/features/auth/store';

interface AppSidebarProps {
  isOpen: boolean;
  onNavigate?: () => void;
}

// Patient navigation
const patientNavigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Your health overview',
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageCircle,
    description: 'Chat with doctors',
  },
  {
    name: 'Symptom Checker',
    href: '/symptom-checker',
    icon: Stethoscope,
    description: 'Check symptoms & specialists',
  },
  {
    name: 'Explore Doctors',
    href: '/doctors',
    icon: Users,
    description: 'Find specialists',
  },
  {
    name: 'Service Offers',
    href: '/services',
    icon: Building2,
    description: 'Compare lab tests & packages',
  },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    description: 'Schedule & manage visits',
  },
  {
    name: 'Medical Records',
    href: '/dashboard/records',
    icon: FileText,
    description: 'Lab results & documents',
  },
  {
    name: 'Report Summary',
    href: '/health-summary',
    icon: Activity,
    description: 'AI-powered summary',
  },
  {
    name: 'Prescription Analyzer',
    href: '/prescription-analyzer',
    icon: Sparkles,
    description: 'Analyze medical prescriptions',
  },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'Account & preferences' },
];

// Doctor navigation
const doctorNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: "Today's schedule" },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageCircle,
    description: 'Chat with patients',
  },
  { name: 'Patients', href: '/patients', icon: Users, description: 'Patient list & records' },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    description: 'Schedule management',
  },
  {
    name: 'Consultations',
    href: '/consultations',
    icon: Stethoscope,
    description: 'Active consultations',
  },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'Profile & availability' },
];

const providerNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Service pricing' },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageCircle,
    description: 'Customer inquiries',
  },
  {
    name: 'Public Offers',
    href: '/services',
    icon: Building2,
    description: 'Patient-facing listings',
  },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'Account preferences' },
];

export function AppSidebar({ isOpen, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Select navigation based on user role
  const navigation =
    user?.role === 'doctor'
      ? doctorNavigation
      : user?.role === 'provider'
        ? providerNavigation
        : patientNavigation;

  // Compute a stable aside class so server/client markup match during hydration
  const asideClass = cn(
    'fixed inset-y-0 left-0 z-40 w-72 border-r border-gray-200 bg-white transition-transform duration-300 dark:border-gray-700 dark:bg-gray-900 lg:static lg:z-auto lg:w-64 lg:translate-x-0',
    isOpen ? 'translate-x-0' : '-translate-x-full'
  );

  return (
    <aside className={asideClass}>
      <nav className="flex flex-col gap-1 p-3">
        {mounted
          ? navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                  title={item.description}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-transform',
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    )}
                  />
                  <div className={cn('min-w-0 flex-1', isOpen ? 'block' : 'hidden lg:block')}>
                    <span className="block font-semibold">{item.name}</span>
                    {!isActive && (
                      <span className="line-clamp-1 text-xs opacity-70">{item.description}</span>
                    )}
                  </div>
                </Link>
              );
            })
          : null}
      </nav>
    </aside>
  );
}
