'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Shield, Trash2, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getConsents, revokeConsent } from '@/features/consent/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { Consent } from '@/types/api';

export function ConsentManagement() {
  const queryClient = useQueryClient();
  const [revokeConfirm, setRevokeConfirm] = useState<number | null>(null);

  // Fetch consents
  const { data, isLoading } = useQuery({
    queryKey: ['consents'],
    queryFn: getConsents,
  });

  const consents = data?.results || [];

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: revokeConsent,
    onSuccess: () => {
      toast.success('Access revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['consents'] });
      setRevokeConfirm(null);
    },
    onError: () => {
      toast.error('Failed to revoke access');
    },
  });

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();

    if (status === 'revoked') {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Revoked
        </Badge>
      );
    }
    if (isExpired || status === 'expired') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  const activeConsents = consents.filter(
    (c: Consent) => c.status === 'active' && new Date(c.expires_at) > new Date()
  );
  const inactiveConsents = consents.filter(
    (c: Consent) => c.status !== 'active' || new Date(c.expires_at) <= new Date()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medical Record Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage which doctors can view your medical records
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Access
                </p>
                <p className="mt-2 text-3xl font-bold text-green-600">{activeConsents.length}</p>
              </div>
              <div className="rounded-full bg-green-50 p-3 dark:bg-green-950/20">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Granted
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {consents.length}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 p-3 dark:bg-blue-950/20">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Revoked/Expired
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {inactiveConsents.length}
                </p>
              </div>
              <div className="rounded-full bg-gray-50 p-3 dark:bg-gray-950/20">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Consents */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Active Access</CardTitle>
          <CardDescription>
            Doctors who currently have access to your medical records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border p-4">
                  <div className="mb-2 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          ) : activeConsents.length > 0 ? (
            <div className="space-y-3">
              {activeConsents.map((consent: Consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/30">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Doctor #{consent.doctor}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Access granted: {format(new Date(consent.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {getStatusBadge(consent.status, consent.expires_at)}
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        Expires: {format(new Date(consent.expires_at), 'MMM d, h:mm a')}
                      </Badge>
                      {consent.scope.read && (
                        <Badge variant="secondary" className="gap-1">
                          Read: {consent.scope.read.join(', ')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setRevokeConfirm(consent.id)}
                    disabled={revokeMutation.isPending}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:bg-gray-800/50">
              <Shield className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-2 font-medium text-gray-600">No active access</p>
              <p className="text-sm text-gray-400">
                Grant access when booking appointments with doctors
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {inactiveConsents.length > 0 && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Access History</CardTitle>
            <CardDescription>Revoked or expired access permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveConsents.map((consent: Consent) => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60 dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-semibold">Doctor #{consent.doctor}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(new Date(consent.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(consent.status, consent.expires_at)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeConfirm !== null} onOpenChange={() => setRevokeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Revoke Medical Record Access?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This doctor will immediately lose access to your medical records. You can grant access
              again later when booking future appointments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeConfirm && revokeMutation.mutate(revokeConfirm)}
              disabled={revokeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
