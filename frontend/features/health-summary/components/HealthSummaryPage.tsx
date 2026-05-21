'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, isAfter } from 'date-fns';
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Shield,
  Sparkles,
  Brain,
  Download,
  Share2,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Zap,
  Loader2,
  FileText,
  ChevronDown,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { getHealthSummary, createHealthSummaryShare, saveHealthSummary, submitHealthSummaryFeedback } from '../api';
import { useAuthStore } from '@/features/auth/store';
import { getMyAppointments } from '@/features/scheduling/api';
import { getMedicalFiles, getMedicalFileBlob } from '@/features/records/api';
import { exportHealthSummaryPdf } from '../exportHealthSummaryPdf';
import type { HealthSummary } from '../types';

import { VitalSignsGrid } from './VitalSignsGrid';
import { ConditionsList } from './ConditionsList';
import { MedicationsList } from './MedicationsList';
import { AllergiesList } from './AllergiesList';
import { AiInsightsSection } from './AiInsightsSection';
import { UpcomingAppointmentsSection } from './UpcomingAppointmentsSection';
import { AiSummaryCard } from './AiSummaryCard';

function isImageFile(file: { mime?: string; filename: string }) {
  const mime = (file.mime || '').toLowerCase();
  const name = (file.filename || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|heic)$/.test(name);
}

function isPdfFile(file: { mime?: string; filename: string }) {
  const mime = (file.mime || '').toLowerCase();
  const name = (file.filename || '').toLowerCase();
  return mime === 'application/pdf' || name.endsWith('.pdf');
}

interface ReportSummaryPageProps {
  sharedData?: HealthSummary;
  isSharedView?: boolean;
}

export function ReportSummaryPage({
  sharedData,
  isSharedView = false,
}: ReportSummaryPageProps = {}) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isDoctor = user?.role === 'doctor';
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [activeFileIds, setActiveFileIds] = useState<number[]>([]);
  const [hasSetDefaults, setHasSetDefaults] = useState(false);
  const [manualTriggered, setManualTriggered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'helpful' | 'unhelpful' | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // Document viewing state
  const [viewFile, setViewFile] = useState<{ id: number; filename: string; mime?: string } | null>(
    null
  );
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const handleViewFile = async (file: { id: number; filename: string; mime?: string }) => {
    if (isSharedView) {
      // In shared view, we don't have access to getMedicalFileBlob without a share token proxy yet.
      // So we can fallback to opening in a new tab or let the component handle it natively via URL
      return;
    }
    setViewFile(file);
    setViewUrl(null);
    setViewLoading(true);
    try {
      const blob = await getMedicalFileBlob(file.id);
      const url = URL.createObjectURL(blob);
      setViewUrl(url);
    } catch {
      toast({ variant: 'destructive', title: 'Could not load file.' });
      setViewFile(null);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewFile = () => {
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    setViewFile(null);
    setViewUrl(null);
  };

  const { data: filesData } = useQuery({
    queryKey: ['medical-files'],
    queryFn: () => getMedicalFiles(),
    enabled: !isSharedView,
  });

  const allFiles = useMemo(() => filesData?.results || [], [filesData]);
  const allFilesSorted = useMemo(() => {
    return [...allFiles].sort((a: any, b: any) => {
      const dateA = new Date(a.clinical_date || a.created_at).getTime();
      const dateB = new Date(b.clinical_date || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [allFiles]);
  const labFiles = useMemo(() => allFilesSorted.filter((f: any) => f.kind === 'lab'), [allFilesSorted]);
  const otherFiles = useMemo(() => allFilesSorted.filter((f: any) => f.kind !== 'lab'), [allFilesSorted]);

  useEffect(() => {
    if (!hasSetDefaults && !isSharedView) {
      const defaults = labFiles.length > 0 ? labFiles : otherFiles;
      if (defaults.length > 0) {
        const threeMonthsAgo = subMonths(new Date(), 3);
        const within3Months = defaults.filter((f) => {
          const d = new Date(f.clinical_date || f.created_at);
          return isAfter(d, threeMonthsAgo);
        });

        // Default logic: include all from last 3 months, AND at least latest 5 if available
        const defaultIds = new Set(within3Months.map((f) => f.id));
        defaults.slice(0, 5).forEach((f) => defaultIds.add(f.id));

        const ids = Array.from(defaultIds);
        setSelectedFileIds(ids);
        setActiveFileIds(ids);
      }
      setHasSetDefaults(true);
    }
  }, [labFiles, otherFiles, hasSetDefaults, isSharedView]);

  const activeFiles = useMemo(() => {
    return allFiles.filter(f => activeFileIds.includes(f.id));
  }, [allFiles, activeFileIds]);

  const labOnly = activeFiles.length > 0 ? activeFiles.every((f: any) => f.kind === 'lab') : labFiles.length > 0;
  const strictMode = true;

  const {
    data: summaryData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['health-summary', activeFileIds, labOnly],
    queryFn: () =>
      getHealthSummary(activeFileIds.length > 0 ? activeFileIds : undefined, {
        strict: strictMode,
        labOnly,
      }),
    enabled: !sharedData && (isSharedView || manualTriggered), // Only fetch if shared view or manually triggered
  });

  const [minLoadingUntil, setMinLoadingUntil] = useState<number | null>(null);
  const isSummarizing = isFetching || minLoadingUntil !== null;
  const [shareLink, setShareLink] = useState<string | null>(null);

  // Use sharedData if available, otherwise use fetched data
  const actualData = sharedData || summaryData;

  useEffect(() => {
    if (!isFetching && minLoadingUntil != null) {
      const remaining = Math.max(0, minLoadingUntil - Date.now());
      const timer = setTimeout(() => setMinLoadingUntil(null), remaining);
      return () => clearTimeout(timer);
    }
  }, [isFetching, minLoadingUntil]);

  const handleSummarize = () => {
    setActiveFileIds(selectedFileIds);
    setManualTriggered(true);
    setMinLoadingUntil(Date.now() + 2500);
    setFeedbackSubmitted(null); // Reset feedback for the new summary
    // refetch is not strictly necessary if activeFileIds changes, but good for safety
    if (activeFileIds.length === selectedFileIds.length && activeFileIds.every(id => selectedFileIds.includes(id))) {
      refetch();
    }
  };

  const toggleFileSelection = (id: number) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveSummary = async () => {
    if (!aiSummary) return;
    setIsSaving(true);
    try {
      await saveHealthSummary({
        summary: aiSummary,
        source_ids: selectedFileIds,
        title: `Report Summary (${format(new Date(), 'MMM d, yyyy')})`
      });
      toast({
        title: 'Summary saved!',
        description: 'You can find this in your profile under "Saved Items".',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to save summary',
        description: 'Please try again later.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (feedbackSubmitted) return;
    setFeedbackSubmitting(true);
    try {
      await submitHealthSummaryFeedback({
        is_helpful: isHelpful,
        summary_text: aiSummary || contentFromRecords.slice(0, 3).join('. '),
      });
      setFeedbackSubmitted(isHelpful ? 'helpful' : 'unhelpful');
      toast({
        title: isHelpful ? 'Thanks for your feedback!' : 'Feedback recorded',
        description: isHelpful
          ? 'Your confirmation helps improve future summaries.'
          : 'We\'ll use this to make the AI more accurate.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Failed to submit feedback',
        description: 'Please try again later.',
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const result = await createHealthSummaryShare();
      const fullUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/share/health-summary/${result.share_token}`
          : '';
      setShareLink(fullUrl);
      toast({
        title: 'Share link created!',
        description: 'Your unique shareable link has been generated.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to create share link',
        description: 'Please try again later.',
      });
    }
  };

  const shareUrl = shareLink || (typeof window !== 'undefined' ? window.location.href : '');
  const handleCopyLink = async () => {
    // Generate share link first if not in shared view and no share link exists
    if (!isSharedView && !shareLink) {
      await handleGenerateShareLink();
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied', description: 'Report Summary link copied to clipboard.' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not copy',
        description: 'Please copy the URL from the address bar.',
      });
    }
  };
  const shareTitle = 'NexusCare Report Summary';
  const shareText = 'View my report summary on NexusCare.';

  const handleShareToApps = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast({ title: 'Shared', description: 'Thanks for sharing.' });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          toast({
            variant: 'destructive',
            title: 'Share failed',
            description: 'Could not open share dialog.',
          });
        }
      }
    } else {
      toast({
        title: 'Not supported in this browser',
        description:
          'Use "Copy link" and paste it in the app or site where you want to share (e.g. email, WhatsApp).',
      });
    }
  };

  const handleShareViaEmail = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    toast({ title: 'Opening email', description: 'Your email app will open with the link.' });
  };

  const handleShareOnX = () => {
    const link = shareUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (!link) {
      toast({
        variant: 'destructive',
        title: 'Cannot share',
        description: 'Page URL is not available.',
      });
      return;
    }
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(link);
    const intentUrl = `https://x.com/intent/tweet?text=${text}&url=${url}`;
    const newWindow = window.open(intentUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed) {
      toast({
        title: 'Popup blocked',
        description: 'Allow popups for this site, or use Copy link and paste in X.',
        variant: 'destructive',
      });
      navigator.clipboard?.writeText(link);
    }
  };
  const { data: appointments = [] } = useQuery({
    queryKey: ['my-appointments'],
    queryFn: getMyAppointments,
  });
  const today = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = appointments
    .filter(
      (a: { status?: string; date?: string }) =>
        a.status === 'scheduled' && a.date && a.date >= today
    )
    .sort((a: { date?: string; start_time?: string }, b: { date?: string; start_time?: string }) =>
      `${a.date}T${a.start_time || ''}`.localeCompare(`${b.date}T${b.start_time || ''}`)
    )
    .slice(0, 5);

  const sourceCounts = actualData?.source_counts ?? {};
  const recordCount = actualData?.record_count ?? 0;
  const dateRange = actualData?.date_range;
  const professionalSummary = actualData?.professional_summary ?? actualData?.summary ?? '';
  const professionalFindings = actualData?.professional_findings ?? [];
  const aiSummary = (professionalSummary || actualData?.summary) ?? '';
  const bullets = actualData?.bullets ?? [];
  const recordHighlights = actualData?.record_highlights ?? [];
  const contentFromRecords =
    professionalFindings.length > 0
      ? professionalFindings
      : recordHighlights.length > 0
        ? recordHighlights
        : bullets;
  const aiInsights = actualData?.ai_insights ?? [];

  const lastUpdatedText = dateRange?.newest ? format(new Date(dateRange.newest), 'MMM d, yyyy') : 'N/A';
  const vitalSigns = [
    {
      label: 'Blood Pressure',
      value: actualData?.extracted_vitals?.blood_pressure || 'N/A',
      unit:
        actualData?.extracted_vitals?.blood_pressure &&
        actualData?.extracted_vitals?.blood_pressure !== 'N/A'
          ? 'mmHg'
          : '',
      status:
        !actualData?.extracted_vitals?.blood_pressure ||
        actualData?.extracted_vitals?.blood_pressure === 'N/A'
          ? 'undefined'
          : 'normal',
      trend: 'stable',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      lastUpdated: lastUpdatedText,
    },
    {
      label: 'Heart Rate',
      value: actualData?.extracted_vitals?.heart_rate || 'N/A',
      unit:
        actualData?.extracted_vitals?.heart_rate &&
        actualData?.extracted_vitals?.heart_rate !== 'N/A'
          ? 'bpm'
          : '',
      status:
        !actualData?.extracted_vitals?.heart_rate ||
        actualData?.extracted_vitals?.heart_rate === 'N/A'
          ? 'undefined'
          : 'normal',
      trend: 'stable',
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
      lastUpdated: lastUpdatedText,
    },
    {
      label: 'Temperature',
      value: actualData?.extracted_vitals?.temperature || 'N/A',
      unit:
        actualData?.extracted_vitals?.temperature &&
        actualData?.extracted_vitals?.temperature !== 'N/A'
          ? '°F'
          : '',
      status:
        !actualData?.extracted_vitals?.temperature ||
        actualData?.extracted_vitals?.temperature === 'N/A'
          ? 'undefined'
          : 'normal',
      trend: 'stable',
      icon: Thermometer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      lastUpdated: lastUpdatedText,
    },
    {
      label: 'Weight',
      value: actualData?.extracted_vitals?.weight || 'N/A',
      unit:
        actualData?.extracted_vitals?.weight && actualData?.extracted_vitals?.weight !== 'N/A'
          ? 'lbs'
          : '',
      status:
        !actualData?.extracted_vitals?.weight || actualData?.extracted_vitals?.weight === 'N/A'
          ? 'undefined'
          : 'normal',
      trend: 'stable',
      icon: Weight,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      lastUpdated: lastUpdatedText,
    },
  ];

  const conditions = actualData?.conditions ?? [];
  const medications = actualData?.medications ?? [];

  const allergies = actualData?.allergies ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      case 'undefined':
        return 'text-gray-500 bg-gray-100 dark:bg-gray-800/50';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20';
      case 'moderate':
        return 'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-950/20';
      case 'severe':
        return 'border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20';
      default:
        return 'border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-950/20';
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing your medical records…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Report Summary</h1>
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Could not load your report summary. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isSharedView ? 'Shared Report Summary' : 'Report Summary'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {isSharedView
              ? 'View-only access to this report summary'
              : 'Your comprehensive health overview powered by AI (from your most recent records)'}
          </p>
        </div>
        {!isSharedView && (
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Select Reports ({selectedFileIds.length})
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Select reports for summary</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                  {labFiles.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No lab reports found. Showing other files below.
                    </div>
                  ) : (
                    labFiles.map(file => (
                      <DropdownMenuCheckboxItem
                        key={file.id}
                        checked={selectedFileIds.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        className="flex flex-col items-start gap-1 py-2"
                      >
                        <span className="font-medium">{file.filename}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(file.clinical_date || file.created_at), 'MMM d, yyyy')} • Lab
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </div>
                {otherFiles.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      Other files
                    </DropdownMenuLabel>
                    <div className="max-h-40 overflow-y-auto">
                      {otherFiles.slice(0, 12).map(file => (
                        <DropdownMenuCheckboxItem
                          key={file.id}
                          checked={selectedFileIds.includes(file.id)}
                          onCheckedChange={() => toggleFileSelection(file.id)}
                          className="flex flex-col items-start gap-1 py-2"
                        >
                          <span className="font-medium">{file.filename}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(file.clinical_date || file.created_at), 'MMM d, yyyy')} •{' '}
                            {file.kind.toUpperCase()}
                          </span>
                        </DropdownMenuCheckboxItem>
                      ))}
                    </div>
                  </>
                )}
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleSummarize}
                    disabled={isSummarizing || selectedFileIds.length === 0}
                  >
                    Update Summary
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleSummarize}
              disabled={isSummarizing || selectedFileIds.length === 0}
              className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg disabled:opacity-70"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Summarizing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Summarize
                </>
              )}
            </Button>

            {aiSummary && (
              <Button
                variant="outline"
                className="gap-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400"
                onClick={handleSaveSummary}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Summary
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                  <Copy className="h-4 w-4" />
                  {shareLink ? 'Copy share link' : 'Generate & copy link'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareViaEmail} className="gap-2">
                  <Mail className="h-4 w-4" />
                  Share via email
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareOnX} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Share on X
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareToApps} className="gap-2">
                  <Link2 className="h-4 w-4" />
                  Share to other apps
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => {
                if (aiSummary || contentFromRecords.length > 0 || recordCount > 0) {
                  exportHealthSummaryPdf({
                    aiSummary,
                    contentFromRecords,
                    conditions: conditions.map((c: { name?: string } | string) =>
                      typeof c === 'object' && c !== null && 'name' in c
                        ? { name: c.name }
                        : { name: String(c) }
                    ),
                    medications: medications.map((m: { name?: string } | string) =>
                      typeof m === 'object' && m !== null && 'name' in m
                        ? { name: m.name }
                        : { name: String(m) }
                    ),
                    sourceCounts,
                    dateRange,
                    recordCount,
                  });
                }
              }}
              disabled={!(aiSummary || contentFromRecords.length > 0 || recordCount > 0)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Share Link Display */}
      {!isSharedView && shareLink && (
        <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-300">
                  ✓ Shareable link generated
                </p>
                <p className="mt-1 text-xs text-green-700 dark:text-green-400">
                  Anyone with this link can view your report summary
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareLink);
                  toast({ title: 'Link copied!' });
                }}
                className="ml-4"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {actualData?.lab_only_fallback && (
        <Card className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-200">
            {actualData.lab_only_message || 'No lab reports found. Showing other files instead.'}
          </CardContent>
        </Card>
      )}

      {/* Loading: beautiful animation while summarizing */}
      {isSummarizing && (
        <Card className="overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-50/90 to-indigo-50/90 shadow-lg dark:from-purple-950/30 dark:to-indigo-950/30">
          <div className="h-1 w-full animate-shimmer bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 bg-[length:200%_100%]" />
          <CardContent className="flex flex-col items-center justify-center px-6 py-16">
            <div className="flex h-20 w-20 animate-pulse-soft items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <p className="mt-6 text-lg font-medium text-foreground">Analyzing your records</p>
            <p className="mt-1 text-sm text-muted-foreground">Building your report summary…</p>
            <div className="mt-6 flex gap-1.5">
              <span
                className="h-2 w-2 animate-dot-bounce rounded-full bg-purple-500"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="h-2 w-2 animate-dot-bounce rounded-full bg-indigo-500"
                style={{ animationDelay: '160ms' }}
              />
              <span
                className="h-2 w-2 animate-dot-bounce rounded-full bg-purple-500"
                style={{ animationDelay: '320ms' }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary from medical records – animated reveal when ready */}
      {!isSummarizing && (actualData?.summary || actualData?.professional_summary || contentFromRecords.length > 0 || recordCount > 0) ? (
        <AiSummaryCard
          aiSummary={aiSummary}
          contentFromRecords={contentFromRecords}
          recordCount={recordCount}
          sourceCounts={sourceCounts}
          dateRange={dateRange}
          professionalFindings={professionalFindings}
          sourceFiles={actualData?.source_files || activeFiles}
          onViewFile={handleViewFile}
        />
      ) : !isSummarizing && !isSharedView && !manualTriggered ? (
        <Card className="border-2 border-dashed border-purple-200 bg-purple-50/30 p-12 dark:bg-purple-950/10">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Ready to generate your report summary?
            </h3>
            <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
              Select the documents you want to include and click "Generate Summary" to get an
              AI-powered overview of your medical history.
            </p>
            <Button
              onClick={handleSummarize}
              className="mt-6 gap-2 bg-purple-600 hover:bg-purple-700"
              size="lg"
            >
              <Zap className="h-4 w-4" />
              Generate Summary
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Feedback: Was this summary helpful? */}
      {!isSummarizing && actualData && !feedbackSubmitted && isDoctor && (
        <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/10 dark:to-indigo-950/10">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Was this summary helpful?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/20"
                onClick={() => handleFeedback(true)}
                disabled={feedbackSubmitting}
              >
                <Activity className="h-4 w-4" />
                Yes, accurate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                onClick={() => handleFeedback(false)}
                disabled={feedbackSubmitting}
              >
                No, incorrect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback: Already submitted */}
      {!isSummarizing && feedbackSubmitted && isDoctor && (
        <Card className="border-2">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            {feedbackSubmitted === 'helpful'
              ? 'Thanks for your feedback! Your confirmation helps improve future summaries.'
              : 'Feedback recorded. We\'ll use this to make the AI more accurate.'}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Vitals & Conditions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Vital Signs */}
          <VitalSignsGrid
            vitalSigns={vitalSigns}
            getTrendIcon={getTrendIcon}
            getStatusColor={getStatusColor}
          />

          {/* Conditions & Medications Tabs */}
          <Tabs defaultValue="conditions" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 sm:grid-cols-3">
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="allergies">Allergies</TabsTrigger>
            </TabsList>

            <TabsContent value="conditions" className="mt-4">
              <ConditionsList
                conditions={conditions}
                contentFromRecords={contentFromRecords}
                getSeverityColor={getSeverityColor}
              />
            </TabsContent>

            <TabsContent value="medications" className="mt-4">
              <MedicationsList
                medications={medications}
                contentFromRecords={contentFromRecords}
              />
            </TabsContent>

            <TabsContent value="allergies" className="mt-4">
              <AllergiesList allergies={allergies} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - AI Insights & Appointments */}
        <div className="space-y-6">
          {/* AI Insights */}
          <AiInsightsSection
            aiInsights={aiInsights}
            contentFromRecords={contentFromRecords}
          />

          {/* Upcoming Appointments */}
          <UpcomingAppointmentsSection upcomingAppointments={upcomingAppointments} />

          {/* Quick Actions */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-6">
              <Button variant="outline" className="w-full justify-start gap-3 py-6" asChild>
                <Link href="/dashboard/records">
                  <Shield className="h-5 w-5" />
                  <span className="text-base">Medical Records</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 py-6" asChild>
                <Link href="/dashboard/records/upload">
                  <Activity className="h-5 w-5" />
                  <span className="text-base">Upload Document</span>
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 py-6" asChild>
                <Link href="/appointments">
                  <Calendar className="h-5 w-5" />
                  <span className="text-base">Appointments</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <Dialog open={!!viewFile} onOpenChange={(open) => !open && closeViewFile()}>
        <DialogContent className="max-w-3xl border bg-background shadow-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              {viewFile?.filename}
            </DialogTitle>
            <DialogDescription>Document Reference</DialogDescription>
          </DialogHeader>
          <div className="min-h-[200px]">
            {viewLoading && (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            {!viewLoading && viewUrl && viewFile && (
              <>
                {isImageFile(viewFile) && (
                  <div className="rounded-lg border bg-muted/30 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewUrl}
                      alt={viewFile.filename}
                      className="max-h-[70vh] w-full rounded-md object-contain"
                    />
                  </div>
                )}
                {isPdfFile(viewFile) && (
                  <div className="rounded-lg border bg-muted/30 p-2">
                    <iframe
                      src={viewUrl}
                      title={viewFile.filename}
                      className="h-[70vh] w-full rounded-md border-0"
                    />
                  </div>
                )}
                {!isImageFile(viewFile) && !isPdfFile(viewFile) && (
                  <div className="rounded-lg border bg-muted/30 p-6 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Preview not available</p>
                    <Button
                      variant="default"
                      className="mt-4"
                      onClick={() => viewUrl && window.open(viewUrl, '_blank')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Open in new tab
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
