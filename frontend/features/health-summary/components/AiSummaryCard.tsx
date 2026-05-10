'use client';

import { Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AiSummaryCardProps {
  aiSummary: string;
  contentFromRecords: string[];
  recordCount: number;
  sourceCounts: any;
  dateRange: any;
  professionalFindings: string[];
}

export function AiSummaryCard({
  aiSummary,
  contentFromRecords,
  recordCount,
  sourceCounts,
  dateRange,
  professionalFindings,
}: AiSummaryCardProps) {
  return (
    <Card className="animate-summary-fade border-2 border-purple-200 bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-950/20 dark:to-indigo-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="h-6 w-6 text-purple-600" />
          AI summary from your medical records
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Generated from lab results, prescriptions, encounters, and documents (most recent by
          date). Uses extractive summarization and medical entity extraction.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recordCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {sourceCounts.lab != null && sourceCounts.lab > 0 && (
              <Badge variant="secondary">Labs: {sourceCounts.lab}</Badge>
            )}
            {sourceCounts.prescription != null && sourceCounts.prescription > 0 && (
              <Badge variant="secondary">Prescriptions: {sourceCounts.prescription}</Badge>
            )}
            {sourceCounts.encounter != null && sourceCounts.encounter > 0 && (
              <Badge variant="secondary">Encounters: {sourceCounts.encounter}</Badge>
            )}
            {sourceCounts.file != null && sourceCounts.file > 0 && (
              <Badge variant="secondary">Documents: {sourceCounts.file}</Badge>
            )}
            {dateRange?.newest && (
              <Badge variant="outline">
                Latest: {format(new Date(dateRange.newest), 'MMM d, yyyy')}
              </Badge>
            )}
          </div>
        )}
        {aiSummary && (
          <p
            className="text-sm leading-relaxed text-foreground"
            data-testid="professional-summary"
          >
            {aiSummary}
          </p>
        )}
        {contentFromRecords.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              {professionalFindings.length > 0
                ? 'Key findings'
                : 'Content from your uploaded records:'}
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {contentFromRecords.map((b, i) => (
                <li
                  key={i}
                  className="animate-summary-stagger opacity-0"
                  style={{ animationDelay: `${(i + 1) * 80}ms` }}
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
