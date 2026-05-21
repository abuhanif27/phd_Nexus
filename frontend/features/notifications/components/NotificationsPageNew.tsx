'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Clock, X, CheckCheck, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  getNotifications,
  acceptAccessRequest,
  markNotificationsRead,
  type BackendNotification,
} from '@/features/notifications/api';
import { approveBookingPermission } from '@/features/consent/api';
import React from 'react';

type NotificationCategory = 'access_request' | 'booking_request' | 'all';

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

  const notifications = useMemo(() => notificationsData?.results || [], [notificationsData]);
  const unreadNotificationIds = useMemo(
    () => notifications.filter((notification) => !notification.read).map((notification) => notification.id),
    [notifications]
  );

  const markReadMutation = useMutation({
    mutationFn: (ids: number[]) => markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (unreadNotificationIds.length > 0 && !markReadMutation.isPending) {
      markReadMutation.mutate(unreadNotificationIds);
    }
  }, [unreadNotificationIds, markReadMutation]);

  const acceptMutation = useMutation({
    mutationFn: (data: { doctorId: number; doctorUserId?: number }) => {
      return acceptAccessRequest(data.doctorId, 24, data.doctorUserId);
    },
    onSuccess: (_data, variables) => {
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

  const approveBookingMutation = useMutation({
    mutationFn: (data: { doctorId: number; notificationId: number }) => {
      return approveBookingPermission(data.doctorId, data.notificationId);
    },
    onSuccess: (_data, variables) => {
      setAcceptedDoctors((prev) => new Set([...prev, variables.doctorId]));
      toast.success('Booking permission granted to doctor');
      setTimeout(() => {
        refetch();
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'consents'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to grant booking permission';
      toast.error(errorMsg);
    },
  });

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (selectedCategory === 'access_request') {
      filtered = notifications.filter((n) => n.payload?.type === 'access_request');
    } else if (selectedCategory === 'booking_request') {
      filtered = notifications.filter((n) => n.payload?.type === 'booking_permission_request');
    }

    // Deduplicate by doctor_id - keep only the most recent request per doctor
    const deduped = new Map<number, BackendNotification>();
    filtered.forEach((n) => {
      const doctorId = n.payload?.from_doctor_id || n.payload?.doctor_id;
      if (doctorId) {
        const key = `${n.payload.type}-${doctorId}`;
        const existing = deduped.get(key as any);
        if (!existing || new Date(n.ts) > new Date(existing.ts)) {
          deduped.set(key as any, n);
        }
      } else {
        // Non-access-request notifications, add them with fake id
        deduped.set(-n.id as any, n);
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

  const bookingRequestCount = useMemo(
    () => notifications.filter((n) => n.payload?.type === 'booking_permission_request').length,
    [notifications]
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
        <p className="text-muted-foreground">Manage your access requests and notifications</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('all')}
          className="w-full sm:w-auto"
        >
          All Notifications ({notifications.length})
        </Button>
        <Button
          variant={selectedCategory === 'access_request' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('access_request')}
          className="w-full sm:w-auto"
        >
          Access Requests ({accessRequestCount})
        </Button>
        <Button
          variant={selectedCategory === 'booking_request' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('booking_request')}
          className="w-full sm:w-auto"
        >
          Booking Requests ({bookingRequestCount})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="w-full gap-2 sm:ml-auto sm:w-auto"
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
              No {selectedCategory === 'access_request' ? 'access request ' : selectedCategory === 'booking_request' ? 'booking request ' : ''}notifications yet
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
              onApproveBooking={(doctorId: number, notificationId: number) =>
                approveBookingMutation.mutate({ doctorId, notificationId })
              }
              isAccepting={acceptMutation.isPending || approveBookingMutation.isPending}
              isAlreadyAccepted={acceptedDoctors.has(notification.payload?.from_doctor_id || notification.payload?.doctor_id || 0)}
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
  onApproveBooking?: (doctorId: number, notificationId: number) => void;
  isAccepting: boolean;
  isAlreadyAccepted?: boolean;
}

function AccessRequestCard({
  notification,
  onAccept,
  onApproveBooking,
  isAccepting,
  isAlreadyAccepted,
}: AccessRequestCardProps): React.ReactElement | null {
  const payload = notification.payload;

  if (payload?.type !== 'access_request' && payload?.type !== 'booking_permission_request') {
    return (
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold">{payload?.message || payload?.body || payload?.title || 'System Notification'}</p>
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

  const doctorId = payload.from_doctor_id || payload.doctor_id;
  const doctorEmail = payload.from_doctor_email || payload.doctor_name || 'Doctor';
  const isBookingRequest = payload.type === 'booking_permission_request';

  return (
    <Card className={cn("overflow-hidden border-l-4 bg-white dark:bg-slate-950", isBookingRequest ? "border-l-purple-500" : "border-l-blue-500")}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={cn("rounded-full p-2", isBookingRequest ? "bg-purple-100 dark:bg-purple-900" : "bg-blue-100 dark:bg-blue-900")}>
              {isBookingRequest ? (
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold">
                {isBookingRequest ? 'Booking Permission Request' : 'Access Request from Doctor'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{doctorEmail}</p>
            </div>
          </div>

          {/* Message */}
          <div className="ml-10 space-y-2">
            <p className="text-sm leading-relaxed text-foreground">{payload.message || payload.body}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.ts), { addSuffix: true })}
            </p>
          </div>

          {/* Actions */}
          <div className="ml-10 flex gap-2 pt-2">
            {doctorId && !isBookingRequest && (
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
            
            {doctorId && isBookingRequest && onApproveBooking && (
              <Button
                size="sm"
                onClick={() => onApproveBooking(doctorId, notification.id)}
                disabled={isAccepting || isAlreadyAccepted}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
                variant={isAlreadyAccepted ? 'outline' : 'default'}
              >
                <CheckCheck className="h-4 w-4" />
                {isAccepting
                  ? 'Approving...'
                  : isAlreadyAccepted
                    ? 'Permission Granted'
                    : 'Approve Booking'}
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
