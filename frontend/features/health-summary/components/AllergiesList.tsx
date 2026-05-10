'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Allergy } from '../types';

interface AllergiesListProps {
  allergies: Allergy[];
}

export function AllergiesList({ allergies }: AllergiesListProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {allergies.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No allergies on file. Update your profile or add them in Medical Records.
            </p>
          ) : (
            allergies.map((allergy, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border-2 border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/20"
              >
                <div className="flex-shrink-0 rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-semibold leading-relaxed text-gray-900 dark:text-white">
                    {allergy.allergen}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    Reaction: {allergy.reaction}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-3 border-red-300 bg-red-100 px-3 py-1 text-red-700"
                  >
                    {allergy.severity} severity
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
