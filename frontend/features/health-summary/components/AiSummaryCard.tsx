import React from 'react';
import { Brain, FileText, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { env } from '@/env';
import type { MedicalFile } from '@/features/records/types';

export interface AiSummaryCardProps {
  aiSummary: string;
  contentFromRecords: string[];
  recordCount: number;
  sourceCounts: any;
  dateRange: any;
  professionalFindings: string[];
  sourceFiles?: MedicalFile[];
  onViewFile?: (file: MedicalFile) => void;
}

export function AiSummaryCard({
  aiSummary,
  contentFromRecords,
  recordCount,
  sourceCounts,
  dateRange,
  professionalFindings,
  sourceFiles = [],
  onViewFile,
}: AiSummaryCardProps) {
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
  const isShared = typeof window !== 'undefined' && window.location.pathname.includes('/shared/');

  const getFileLink = (fileId: number) => {
    if (isShared) {
      return `${baseUrl}/api/records/files/${fileId}/serve/`;
    }
    return `/dashboard/records?fileId=${fileId}`;
  };

  const handleFileClick = (e: React.MouseEvent, fileId: number) => {
    if (onViewFile) {
      e.preventDefault();
      const file = sourceFiles.find((f) => f.id === fileId);
      if (file) {
        onViewFile(file);
      }
    }
  };

  const renderTextWithCitations = (text: string) => {
    // Split text by the citation pattern [file:id]
    const parts = text.split(/(\[file:\d+\])/gi);

    return parts.map((part, index) => {
      const match = part.match(/\[file:(\d+)\]/i);
      if (match) {
        const fileId = parseInt(match[1], 10);
        const fileMeta = sourceFiles.find((f) => f.id === fileId);
        const fileIndex = fileMeta ? sourceFiles.indexOf(fileMeta) + 1 : '*';

        return (
          <a
            key={index}
            href={getFileLink(fileId)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleFileClick(e, fileId)}
            className="ml-1 inline-flex items-center justify-center rounded-sm bg-purple-100 px-1.5 py-0.5 align-super text-[10px] font-bold text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900/70"
            title={fileMeta?.filename || `Source Document ${fileId}`}
          >
            [{fileIndex}]
          </a>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

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
          <p className="text-sm leading-relaxed text-foreground" data-testid="professional-summary">
            {renderTextWithCitations(aiSummary)}
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
                  {renderTextWithCitations(b)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sourceFiles.length > 0 && (
          <div className="mt-4 border-t border-purple-100 pt-4 dark:border-purple-900/30">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="h-4 w-4 text-purple-600" />
              Source Documents ({sourceFiles.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {sourceFiles.map((file, idx) => (
                <a
                  key={file.id}
                  href={getFileLink(file.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleFileClick(e, file.id)}
                  className="flex items-center gap-2 rounded-md border border-purple-100 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-purple-50 dark:border-purple-900/50 dark:bg-gray-800 dark:hover:bg-purple-900/20"
                  title={`Open ${file.filename}`}
                >
                  <span className="font-bold text-purple-600 dark:text-purple-400">[{idx + 1}]</span>
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="max-w-[150px] truncate">{file.filename}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

