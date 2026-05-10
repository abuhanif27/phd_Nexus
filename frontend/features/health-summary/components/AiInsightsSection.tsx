'use client';

import { Brain, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AiInsightsSectionProps {
  aiInsights: string[];
  contentFromRecords: string[];
}

export function AiInsightsSection({ aiInsights, contentFromRecords }: AiInsightsSectionProps) {
  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-4 dark:from-purple-950/20 dark:to-pink-950/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-6 w-6 text-purple-600" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {aiInsights.length === 0 && contentFromRecords.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No insights yet. Add medical records (labs, prescriptions, encounters) to get
              personalized AI insights.
            </p>
          ) : (
            <>
              {aiInsights.length > 0 &&
                aiInsights.map((insight, index) => (
                  <div
                    key={`insight-${index}`}
                    className="flex gap-4 rounded-lg bg-purple-50 p-4 dark:bg-purple-950/20"
                  >
                    <Zap className="mt-1 h-5 w-5 flex-shrink-0 text-purple-600" />
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {insight}
                    </p>
                  </div>
                ))}
              {aiInsights.length === 0 && contentFromRecords.length > 0 && (
                <>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    From your uploaded records:
                  </p>
                  {contentFromRecords.slice(0, 5).map((line, index) => (
                    <div
                      key={`record-${index}`}
                      className="flex gap-4 rounded-lg bg-purple-50 p-4 dark:bg-purple-950/20"
                    >
                      <Zap className="mt-1 h-5 w-5 flex-shrink-0 text-purple-600" />
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                        {line}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
