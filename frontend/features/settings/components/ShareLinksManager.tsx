'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Link2,
  Trash2,
  Copy,
  ExternalLink,
  AlertCircle,
  Clock,
  Share2,
  Loader2,
  Power,
  PowerOff,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import {
  getHealthSummaryShares,
  deactivateHealthSummaryShare,
  createHealthSummaryShare,
  toggleHealthSummaryShareStatus,
} from '@/features/health-summary/api';
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

export function ShareLinksManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteToken, setDeleteToken] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['health-summary-shares'],
    queryFn: getHealthSummaryShares,
  });

  const deleteMutation = useMutation({
    mutationFn: deactivateHealthSummaryShare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-summary-shares'] });
      toast({
        title: 'Link deleted',
        description: 'The share link has been permanently deleted.',
      });
      setDeleteToken(null);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete',
        description: 'Could not delete the share link. Please try again.',
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (token: string) => toggleHealthSummaryShareStatus(token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['health-summary-shares'] });
      toast({
        title: data.is_active ? 'Link reactivated' : 'Link deactivated',
        description: data.is_active
          ? 'The share link is now active again.'
          : 'The share link is now inactive. No one can access it.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Failed to update',
        description: 'Could not update the share link. Please try again.',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createHealthSummaryShare(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-summary-shares'] });
      toast({
        title: 'Share link created',
        description: 'Your new shareable link has been generated.',
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to create share link';
      toast({
        variant: 'destructive',
        title: 'Cannot create link',
        description: errorMessage,
      });
    },
  });

  const handleCopyLink = async (shareToken: string) => {
    const url = `${window.location.origin}/share/health-summary/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied!',
        description: 'Share link has been copied to clipboard.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
      });
    }
  };

  const handleOpenLink = (shareToken: string) => {
    const url = `/share/health-summary/${shareToken}`;
    window.open(url, '_blank');
  };

  const shares = data?.shares || [];
  const totalCount = shares.length;
  const limitReached = totalCount >= 10;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading share links...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-4 text-gray-600">Failed to load share links.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Share2 className="h-6 w-6 text-blue-600" />
            Health Summary Share Links
          </CardTitle>
          <CardDescription className="text-base">
            Manage your shareable health summary links. You can create up to 10 unique links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border-2 border-blue-300 bg-white p-4 dark:bg-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Share Links Created
              </p>
              <p className="mt-1 text-3xl font-bold text-blue-600">
                {totalCount} <span className="text-lg text-gray-500">/ 10</span>
              </p>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={limitReached || createMutation.isPending}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Create New Link
                </>
              )}
            </Button>
          </div>
          {limitReached && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/20">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-400">Limit Reached</p>
                <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                  You've reached the maximum of 10 share links. Delete an old link to create a new
                  one.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-blue-900 dark:text-blue-300">Managing Share Links</p>
              <ul className="space-y-1 text-blue-800 dark:text-blue-400">
                <li className="flex items-start gap-2">
                  <PowerOff className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    <strong>Deactivate:</strong> Temporarily disable a link (can be reactivated
                    later)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Trash2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    <strong>Delete Permanently:</strong> Completely remove an inactive link from the
                    database (cannot be undone)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Toggle */}
      {shares.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-inactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="show-inactive" className="text-sm text-gray-700 dark:text-gray-300">
              Show inactive links
            </label>
          </div>
        </div>
      )}

      {/* Links List */}
      {shares.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Link2 className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              No Share Links Yet
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create your first shareable link to share your health summary with others.
            </p>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="mt-6 gap-2"
            >
              <Link2 className="h-4 w-4" />
              Create Your First Link
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {shares
            .filter((share) => showInactive || share.is_active)
            .map((share, index) => (
              <Card
                key={share.share_token}
                className={`transition-all hover:shadow-md ${
                  share.is_active && share.is_valid
                    ? 'border-2 border-green-200 bg-green-50/50 dark:bg-green-950/10'
                    : 'border-2 border-gray-300 bg-gray-100/80 opacity-75 dark:bg-gray-900/50'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            share.is_active && share.is_valid ? 'bg-green-600' : 'bg-gray-400'
                          }`}
                        >
                          <span className="text-lg font-bold text-white">#{index + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate font-semibold text-gray-900 dark:text-white">
                              Share Link {index + 1}
                            </h4>
                            {share.is_active && share.is_valid ? (
                              <Badge className="bg-green-600">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                Created {format(new Date(share.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {share.expires_at && (
                              <div className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                <span>
                                  Expires {format(new Date(share.expires_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-white px-3 py-2 dark:bg-gray-900">
                            <Link2 className="h-4 w-4 flex-shrink-0 text-blue-600" />
                            <code className="flex-1 truncate text-xs text-gray-600">
                              /share/health-summary/{share.share_token}
                            </code>
                          </div>
                          {!share.is_active && (
                            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:bg-amber-950/20">
                              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                              <div className="text-xs">
                                <p className="font-semibold text-amber-900 dark:text-amber-400">
                                  Link Inactive
                                </p>
                                <p className="text-amber-700 dark:text-amber-300">
                                  This link cannot be accessed. Reactivate it or delete it
                                  permanently.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(share.share_token)}
                        disabled={!share.is_active || !share.is_valid}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenLink(share.share_token)}
                        disabled={!share.is_active || !share.is_valid}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Button>
                      {!share.is_active && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => toggleMutation.mutate(share.share_token)}
                          disabled={toggleMutation.isPending}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Power className="h-4 w-4" />
                          Reactivate
                        </Button>
                      )}
                      {!share.is_active ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setDeleteToken(share.share_token);
                          }}
                          disabled={deleteMutation.isPending}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Permanently
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleMutation.mutate(share.share_token)}
                          disabled={toggleMutation.isPending}
                          className="gap-2 border-amber-300 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        >
                          <PowerOff className="h-4 w-4" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteToken} onOpenChange={() => setDeleteToken(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Permanently Delete Share Link?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <div className="font-medium text-gray-900 dark:text-white">
                  This will permanently delete this share link from the database.
                </div>
                <div>
                  Anyone with this link will no longer be able to access your health summary.
                </div>
                <div className="font-semibold text-destructive">This action cannot be undone.</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteToken && deleteMutation.mutate(deleteToken)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
