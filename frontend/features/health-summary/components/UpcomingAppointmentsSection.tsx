'use client';

import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Appointment {
  id?: number;
  date: string;
  start_time?: string;
  doctor_name?: string;
  doctor?: number;
  specialty?: string;
  status?: string;
}

interface UpcomingAppointmentsSectionProps {
  upcomingAppointments: Appointment[];
}

export function UpcomingAppointmentsSection({ upcomingAppointments }: UpcomingAppointmentsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-6 w-6 text-blue-600" />
          Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        {upcomingAppointments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No upcoming appointments. Book one from the Appointments page.
          </p>
        ) : (
          upcomingAppointments.map((apt, index) => (
            <div
              key={apt.id ?? index}
              className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition-all hover:shadow-md dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30"
            >
              <div className="mb-3 flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="border-blue-300 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                >
                  Scheduled
                </Badge>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(apt.date), 'MMM d, yyyy')}
                </div>
              </div>
              <h4 className="mb-1 text-base font-bold text-gray-900 dark:text-white">
                {apt.doctor_name ?? `Doctor #${apt.doctor}`}
              </h4>
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                {apt.specialty ?? '—'}
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-800/60">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {apt.start_time ?? '—'}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
