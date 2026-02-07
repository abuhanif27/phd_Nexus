'use client';

import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Calendar,
  Heart,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Pill,
  MessageSquare,
  Settings,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';

type NotificationType =
  | 'appointment'
  | 'health'
  | 'medication'
  | 'result'
  | 'message'
  | 'system'
  | 'reminder';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'appointment',
      priority: 'high',
      title: 'Upcoming Appointment Reminder',
      message: 'You have an appointment with Dr. Sarah Smith tomorrow at 10:00 AM',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      actionUrl: '/appointments',
      actionLabel: 'View Details',
    },
    {
      id: '2',
      type: 'medication',
      priority: 'urgent',
      title: 'Medication Reminder',
      message: 'Time to take your Metformin 500mg. Next dose scheduled for 6:00 PM today.',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
      actionUrl: '/health-summary',
      actionLabel: 'Mark as Taken',
    },
    {
      id: '3',
      type: 'result',
      priority: 'high',
      title: 'Lab Results Available',
      message: 'Your blood test results from Nov 1, 2025 are now available for review.',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      read: false,
      actionUrl: '/records',
      actionLabel: 'View Results',
    },
    {
      id: '4',
      type: 'health',
      priority: 'medium',
      title: 'Health Score Updated',
      message: 'Your health score has improved to 85/100. Keep up the great work!',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      actionUrl: '/health-summary',
      actionLabel: 'View Summary',
    },
    {
      id: '5',
      type: 'message',
      priority: 'medium',
      title: 'New Message from Dr. John Doe',
      message: 'Dr. John Doe has sent you a message regarding your recent consultation.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      actionUrl: '/messages',
      actionLabel: 'Read Message',
    },
    {
      id: '6',
      type: 'reminder',
      priority: 'low',
      title: 'Annual Checkup Due',
      message: "It's been 11 months since your last checkup. Schedule your annual physical exam.",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      actionUrl: '/appointments',
      actionLabel: 'Schedule Now',
    },
    {
      id: '7',
      type: 'system',
      priority: 'low',
      title: 'Privacy Policy Updated',
      message: "We've updated our privacy policy. Please review the changes at your convenience.",
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      actionUrl: '/settings',
      actionLabel: 'Review Policy',
    },
    {
      id: '8',
      type: 'appointment',
      priority: 'medium',
      title: 'Appointment Confirmed',
      message:
        'Your appointment with Dr. Sarah Smith on Nov 10, 2025 at 10:00 AM has been confirmed.',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      actionUrl: '/appointments',
      actionLabel: 'View Appointment',
    },
  ]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment':
        return Calendar;
      case 'health':
        return Heart;
      case 'medication':
        return Pill;
      case 'result':
        return FileText;
      case 'message':
        return MessageSquare;
      case 'system':
        return Settings;
      case 'reminder':
        return Clock;
      default:
        return Bell;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800';
      case 'medium':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
      case 'low':
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-700';
    }
  };

  const getPriorityBadgeColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-600 text-white';
      case 'medium':
        return 'bg-blue-600 text-white';
      case 'low':
        return 'bg-gray-500 text-white';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const deleteAllRead = () => {
    setNotifications(notifications.filter((n) => !n.read));
  };

  const filterNotifications = (filter: string) => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications.filter((n) => n.type === filter);
  };

  const filteredNotifications = filterNotifications(activeTab);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 p-3">
                  <Bell className="h-8 w-8 text-white" />
                </div>
                {unreadCount > 0 && (
                  <Badge className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 p-0 text-xs font-bold text-white">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {unreadCount > 0
                    ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                    : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {unreadCount > 0 && (
                <Button variant="outline" onClick={markAllAsRead} className="hidden sm:flex">
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark All Read
                </Button>
              )}
              <Button
                variant="outline"
                onClick={deleteAllRead}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Read
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-white p-2 dark:bg-gray-800">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Bell className="h-4 w-4" />
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <AlertCircle className="h-4 w-4" />
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger
              value="appointment"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger
              value="health"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Heart className="h-4 w-4" />
              Health
            </TabsTrigger>
            <TabsTrigger
              value="medication"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <Pill className="h-4 w-4" />
              Medications
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
            >
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Bell className="mb-4 h-16 w-16 text-gray-300" />
                  <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                    No Notifications
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You're all caught up! Check back later for updates.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <Card
                    key={notification.id}
                    className={cn(
                      'group transition-all hover:shadow-lg',
                      !notification.read &&
                        'border-l-4 border-l-blue-600 bg-blue-50/50 dark:bg-blue-950/20'
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div
                          className={cn(
                            'flex-shrink-0 rounded-full border-2 p-3',
                            getPriorityColor(notification.priority)
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                              )}
                            </div>
                            <Badge className={getPriorityBadgeColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>

                          <p className="mb-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                              })}
                            </div>

                            <div className="flex gap-2">
                              {notification.actionUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  {notification.actionLabel}
                                </Button>
                              )}
                              {!notification.read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle2 className="mr-1 h-4 w-4" />
                                  Mark Read
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNotification(notification.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        {notifications.length > 0 && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">
                Notification Summary
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-400">
                        {notifications.filter((n) => n.type === 'appointment').length}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300">Appointments</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-red-50 p-4 dark:bg-red-950/20">
                  <div className="flex items-center gap-3">
                    <Pill className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-900 dark:text-red-400">
                        {notifications.filter((n) => n.type === 'medication').length}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300">Medications</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-400">
                        {notifications.filter((n) => n.type === 'result').length}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">Results</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/20">
                  <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-400">
                        {notifications.filter((n) => n.type === 'health').length}
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300">Health Updates</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
