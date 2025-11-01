'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Brain,
  Calendar,
  FileText,
  Activity,
  Users,
  Stethoscope,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/features/auth/store';

interface AppSidebarProps {
  isOpen: boolean;
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
    name: 'AI Analysis',
    href: '/ai-analysis',
    icon: Brain,
    description: 'Symptom analysis & insights',
  },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    description: 'Schedule & manage visits',
  },
  {
    name: 'Medical Records',
    href: '/records',
    icon: FileText,
    description: 'Lab results & documents',
  },
  {
    name: 'Health Summary',
    href: '/health-summary',
    icon: Activity,
    description: 'AI-powered summary',
  },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'Account & preferences' },
];

// Doctor navigation
const doctorNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: "Today's schedule" },
  { name: 'Patients', href: '/patients', icon: Users, description: 'Patient list & records' },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: Calendar,
    description: 'Schedule management',
  },
  {
    name: 'AI Insights',
    href: '/ai-insights',
    icon: Sparkles,
    description: 'Patient analysis tools',
  },
  {
    name: 'Consultations',
    href: '/consultations',
    icon: Stethoscope,
    description: 'Active consultations',
  },
  { name: 'Settings', href: '/settings', icon: Settings, description: 'Profile & availability' },
];

export function AppSidebar({ isOpen }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // Select navigation based on user role
  const navigation = user?.role === 'doctor' ? doctorNavigation : patientNavigation;

  return (
    <aside
      className={cn(
        'border-r bg-gradient-to-b from-white to-gray-50 transition-all duration-300 dark:from-gray-900 dark:to-gray-800',
        isOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}
    >
      {/* Role Badge */}
      {isOpen && (
        <div className="border-b bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
          <div className="flex items-center space-x-2 text-white">
            {user?.role === 'doctor' ? (
              <Stethoscope className="h-5 w-5" />
            ) : (
              <Activity className="h-5 w-5" />
            )}
            <div>
              <p className="text-xs font-medium opacity-90">
                {user?.role === 'doctor' ? 'Doctor Portal' : 'Patient Portal'}
              </p>
              <p className="text-sm font-semibold">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex flex-col gap-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
              title={item.description}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform',
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                )}
              />
              {isOpen && (
                <div className="flex-1">
                  <span className="block">{item.name}</span>
                  {!isActive && <span className="text-xs opacity-60">{item.description}</span>}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Features Badge */}
      {isOpen && (
        <div className="mx-3 mb-3 mt-auto rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
          <div className="flex items-start space-x-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-blue-900">AI-Powered</p>
              <p className="mt-0.5 text-xs text-blue-700">
                {user?.role === 'doctor'
                  ? 'Patient analysis & insights'
                  : 'Symptom analysis available'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
