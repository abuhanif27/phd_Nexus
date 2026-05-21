'use client';

import { useCurrentUser } from '@/features/auth/hooks';
import { PatientDashboard } from '@/features/patients/components/PatientDashboard';
import { DoctorDashboard } from '@/features/doctors/components/DoctorDashboard';
import { ProviderDashboard } from '@/features/service-providers/components/ProviderDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Users, Server, ShieldAlert, Settings, LogIn, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Handle Unauthenticated State Gracefully
  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <ShieldAlert className="h-10 w-10 text-slate-500" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-3xl font-bold tracking-tight">Authentication Required</h1>
          <p className="text-muted-foreground">
            You need to be logged in to access the dashboard. Please sign in or create an account to continue.
          </p>
        </div>
        <div className="flex space-x-4">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  if (user.role === 'patient') {
    return <PatientDashboard />;
  }

  if (user.role === 'doctor') {
    return <DoctorDashboard />;
  }

  if (user.role === 'provider') {
    return <ProviderDashboard />;
  }

  // Admin / General Platform Dashboard (Fallback for admin or unknown roles)
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, <span className="font-medium text-foreground">{user.email}</span>. Here is your system status.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            Role: {user.role?.toUpperCase() || 'ADMIN'}
          </Badge>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,248</div>
            <p className="text-xs text-muted-foreground mt-1">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.9%</div>
            <p className="text-xs text-muted-foreground mt-1">
              All services operational
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI API Status</CardTitle>
            <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Connected</div>
            <p className="text-xs text-muted-foreground mt-1">
              Hugging Face Engine Online
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              No active threats
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Administrative tools and platform settings</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button variant="outline" className="justify-start w-full group">
              <Users className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              Manage Users & Roles
              <ArrowRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button variant="outline" className="justify-start w-full group">
              <Activity className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              View System Logs
              <ArrowRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            <Button variant="outline" className="justify-start w-full group">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              Platform Settings
              <ArrowRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {[
                { label: 'New doctor registration: Dr. Smith', time: '10 minutes ago' },
                { label: 'System backup completed successfully', time: '2 hours ago' },
                { label: 'AI Model latency spike detected and resolved', time: '5 hours ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center">
                  <span className="relative flex h-2 w-2 mr-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.label}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
