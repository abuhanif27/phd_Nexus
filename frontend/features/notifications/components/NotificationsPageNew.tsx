'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle2, Clock, Trash2, X, CheckCheck, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  getNotifications,
  acceptAccessRequest,
  type BackendNotification,
} from '@/features/notifications/api';
import React from 'react';

type NotificationCategory = 'access_request' | 'all';

export function NotificationsPage(): React.ReactElement {
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');
  const queryClient = useQueryClient();
  const [acceptedDoctors, setAcceptedDoctors] = useState<Set<number>>(new Set());

  const {
    data: notificationsData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  useEffect(() => {
    // Refetch when component mounts to ensure latest data
    refetch();
  }, [refetch]);

  const notifications = notificationsData?.results || [];

  const acceptMutation = useMutation({
    mutationFn: (data: { doctorId: number; doctorUserId?: number }) => {
      console.log('Accepting access request from doctor:', data);
      return acceptAccessRequest(data.doctorId, 24, data.doctorUserId);
    },
    onSuccess: (data, variables) => {
      console.log('Access granted:', data);
      setAcceptedDoctors((prev) => new Set([...prev, variables.doctorId]));
      toast.success('Access granted to doctor');
      // Refetch notifications to update the list
      setTimeout(() => {
        refetch();
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'consents'] });
    },
    onError: (error: any) => {
      console.error('Error granting access:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to grant access';
      toast.error(errorMsg);
    },
  });

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (selectedCategory === 'access_request') {
      filtered = notifications.filter((n) => n.payload?.type === 'access_request');
    }

    // Deduplicate by doctor_id - keep only the most recent request per doctor
    const deduped = new Map<number, BackendNotification>();
    filtered.forEach((n) => {
      const doctorId = n.payload?.from_doctor_id;
      if (doctorId) {
        const existing = deduped.get(doctorId);
        if (!existing || new Date(n.ts) > new Date(existing.ts)) {
          deduped.set(doctorId, n);
        }
      } else {
        // Non-access-request notifications, add them with fake id
        deduped.set(-n.id, n);
      }
    });

    return Array.from(deduped.values()).sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    );
  }, [notifications, selectedCategory]);

  const accessRequestCount = useMemo(
    () => notifications.filter((n) => n.payload?.type === 'access_request').length,
    [notifications]
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Manage your access requests and notifications</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('all')}
        >
          All Notifications ({notifications.length})
        </Button>
        <Button
          variant={selectedCategory === 'access_request' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('access_request')}
        >
          Access Requests ({accessRequestCount})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="ml-auto gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {filteredNotifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Clock className="mx-auto mb-3 h-8 w-8 opacity-50" />
            <p>
              No {selectedCategory === 'access_request' ? 'access request ' : ''}notifications yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <AccessRequestCard
              key={notification.id}
              notification={notification}
              onAccept={(doctorId: number, doctorUserId?: number) =>
                acceptMutation.mutate({ doctorId, doctorUserId })
              }
              isAccepting={acceptMutation.isPending}
              isAlreadyAccepted={acceptedDoctors.has(notification.payload?.from_doctor_id || 0)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AccessRequestCardProps {
  notification: BackendNotification;
  onAccept: (doctorId: number, doctorUserId?: number) => void;
  isAccepting: boolean;
  isAlreadyAccepted?: boolean;
}

function AccessRequestCard({
  notification,
  onAccept,
  isAccepting,
  isAlreadyAccepted,
}: AccessRequestCardProps): React.ReactElement | null {
  const payload = notification.payload;

  if (payload?.type !== 'access_request') {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold">{payload?.message || 'System Notification'}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.ts), { addSuffix: true })}
              </p>
            </div>
            <Badge variant="secondary" className="ml-2">
              {notification.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  const doctorId = payload.from_doctor_id;
  const doctorEmail = payload.from_doctor_email;

  return (
    <Card className="overflow-hidden border-l-4 border-l-blue-500 bg-white dark:bg-slate-950">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold">Access Request from Doctor</h3>
              <p className="mt-1 text-sm text-muted-foreground">{doctorEmail}</p>
            </div>
          </div>

          {/* Message */}
          <div className="ml-10 space-y-2">
            <p className="text-sm leading-relaxed text-foreground">{payload.message}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.ts), { addSuffix: true })}
            </p>
          </div>

          {/* Actions */}
          <div className="ml-10 flex gap-2 pt-2">
            {doctorId && (
              <Button
                size="sm"
                onClick={() => onAccept(doctorId, payload.from_doctor_user_id)}
                disabled={isAccepting || isAlreadyAccepted}
                className="gap-2"
                variant={isAlreadyAccepted ? 'outline' : 'default'}
              >
                <CheckCheck className="h-4 w-4" />
                {isAccepting
                  ? 'Granting Access...'
                  : isAlreadyAccepted
                    ? 'Access Granted'
                    : 'Grant Access'}
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
