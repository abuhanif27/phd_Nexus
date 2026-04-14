'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, Bell, User, Heart, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/features/auth/store';
import { useLogout } from '@/features/auth/hooks';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface AppHeaderProps {
  onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="hover:bg-blue-50 dark:hover:bg-gray-800"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-xl font-bold text-transparent">
            NexusCare
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle className="hover:bg-blue-50 dark:hover:bg-gray-800" />

        {/* Notifications */}
        <Link href="/notifications">
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-blue-50 dark:hover:bg-gray-800"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white shadow-lg">
              3
            </span>
          </Button>
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-gray-800"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                <User className="h-5 w-5" />
              </div>
              {mounted && user && (
                <div className="hidden text-left md:block">
                  <p className="text-sm font-semibold">
                    {user.role === 'patient'
                      ? user.patient_profile?.name || 'User'
                      : user.role === 'doctor'
                        ? user.doctor_profile?.name || 'User'
                        : 'User'}
                  </p>
                  <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{user.role}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 dark:border-gray-700 dark:bg-gray-800">
            <DropdownMenuLabel className="dark:text-gray-200">
              <div>
                <p className="text-sm font-medium">
                  {user?.role === 'patient'
                    ? user?.patient_profile?.name || 'User'
                    : user?.role === 'doctor'
                      ? user?.doctor_profile?.name || 'User'
                      : 'User'}
                </p>
                <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
                  {user?.role} Portal
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="dark:bg-gray-700" />
            <DropdownMenuItem asChild className="dark:hover:bg-gray-700">
              <Link href="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="dark:hover:bg-gray-700">
              <Link href="/settings" className="flex items-center">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="dark:bg-gray-700" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-red-600 dark:text-red-400 dark:hover:bg-gray-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
