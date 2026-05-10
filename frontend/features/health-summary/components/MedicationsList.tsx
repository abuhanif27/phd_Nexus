'use client';

import { Pill, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Medication } from '../types';

interface MedicationsListProps {
  medications: Medication[];
  contentFromRecords: string[];
}

export function MedicationsList({ medications, contentFromRecords }: MedicationsListProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {medications.length === 0 && contentFromRecords.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No medications extracted from your records yet. Add prescriptions for AI to
              list medications.
            </p>
          ) : (
            <>
              {medications.length > 0 &&
                medications.map((med, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-4 rounded-lg border-2 border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950/20"
                  >
                    <div className="flex flex-1 gap-4">
                      <div className="flex-shrink-0 rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                        <Pill className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold leading-relaxed text-gray-900 dark:text-white">
                          {med.name}
                        </h4>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                          {[med.dosage, med.frequency].filter(Boolean).join(' • ') || '—'}
                        </p>
                        {(med.start_date || (med as any).nextDose) && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            {(med as any).nextDose
                              ? `Next dose: ${(med as any).nextDose}`
                              : `Start: ${med.start_date}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      className={`flex-shrink-0 px-3 py-1 ${
                        med.status === 'active' 
                          ? 'bg-green-600' 
                          : med.status === 'on_hold'
                            ? 'bg-yellow-600'
                            : med.status === 'discontinued'
                              ? 'bg-red-600'
                              : 'bg-gray-500'
                      }`}
                    >
                      {med.status === 'on_hold' ? 'On Hold' : med.status.charAt(0).toUpperCase() + med.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              {medications.length === 0 && contentFromRecords.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Content from your uploaded records:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                    {contentFromRecords.slice(0, 10).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
