'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { getSharedHealthSummary } from '@/features/health-summary/api';
import { HealthSummaryPage } from '@/features/health-summary/components/HealthSummaryPage';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SharedHealthSummaryPage() {
  const params = useParams();
  const shareToken = params?.shareToken as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-health-summary', shareToken],
    queryFn: () => getSharedHealthSummary(shareToken),
    enabled: !!shareToken,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading health summary...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="mx-auto max-w-2xl">
          <Card className="border-destructive/50">
            <CardContent className="p-12 text-center">
              <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
              <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
                Invalid or Expired Link
              </h1>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                This health summary link is either invalid, has expired, or has been deactivated.
              </p>
              <div className="mt-8 flex justify-center gap-4">
                <Button asChild variant="outline">
                  <Link href="/login">
                    <Lock className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/">Go Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render the health summary with shared data (in view-only mode)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="border-b bg-white py-4 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Shared Health Summary
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                This is a shared view of someone's health summary
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Sign In to NexusCare</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Pass shared data to HealthSummaryPage component */}
      <HealthSummaryPage sharedData={data} isSharedView={true} />
    </div>
  );
}
