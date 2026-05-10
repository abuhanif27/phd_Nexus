'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { HealthCondition } from '../types';

interface ConditionsListProps {
  conditions: HealthCondition[];
  contentFromRecords: string[];
  getSeverityColor: (severity: string) => string;
}

export function ConditionsList({ conditions, contentFromRecords, getSeverityColor }: ConditionsListProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {conditions.length === 0 && contentFromRecords.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No conditions extracted from your records yet. Add lab results and encounter
              notes for AI to identify conditions.
            </p>
          ) : (
            <>
              {conditions.length > 0 &&
                conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex flex-1 gap-4">
                      <div className="mt-1 flex-shrink-0">
                        {condition.status === 'managed' ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-yellow-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold leading-relaxed text-gray-900 dark:text-white">
                          {condition.name}
                        </h4>
                        {(condition.diagnosed_date || (condition as any).diagnosed) && (
                          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            Diagnosed:{' '}
                            {format(
                              new Date(
                                (condition.diagnosed_date ||
                                  (condition as any).diagnosed) as string
                              ),
                              'MMM d, yyyy'
                            )}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={`px-3 py-1 ${getSeverityColor(condition.severity)}`}
                          >
                            {condition.severity.charAt(0).toUpperCase() +
                              condition.severity.slice(1)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`px-3 py-1 ${
                              condition.status === 'managed'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {condition.status.charAt(0).toUpperCase() +
                              condition.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {conditions.length === 0 && contentFromRecords.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Findings from your uploaded records:
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
