'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Activity,
  Heart,
  Thermometer,
  Weight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Pill,
  Shield,
  Sparkles,
  Brain,
  Download,
  Share2,
  Copy,
  Link2,
  Mail,
  MessageCircle,
  Clock,
  Target,
  Zap,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { getHealthSummary } from '../api';
import { getMyAppointments } from '@/features/scheduling/api';
import { exportHealthSummaryPdf } from '../exportHealthSummaryPdf';

export function HealthSummaryPage() {
  const { data: summaryData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['health-summary'],
    queryFn: getHealthSummary,
  });
  const [minLoadingUntil, setMinLoadingUntil] = useState<number | null>(null);
  const isSummarizing = isFetching || minLoadingUntil !== null;
  const { toast } = useToast();

  useEffect(() => {
    if (!isFetching && minLoadingUntil != null) {
      const remaining = Math.max(0, minLoadingUntil - Date.now());
      const timer = setTimeout(() => setMinLoadingUntil(null), remaining);
      return () => clearTimeout(timer);
    }
  }, [isFetching, minLoadingUntil]);

  const handleSummarize = () => {
    setMinLoadingUntil(Date.now() + 2500);
    refetch();
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'Link copied', description: 'Health Summary link copied to clipboard.' });
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy', description: 'Please copy the URL from the address bar.' });
    }
  };
  const shareTitle = 'NexusCare Health Summary';
  const shareText = 'View my health summary on NexusCare.';

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
          toast({ variant: 'destructive', title: 'Share failed', description: 'Could not open share dialog.' });
        }
      }
    } else {
      toast({
        title: 'Not supported in this browser',
        description: 'Use "Copy link" and paste it in the app or site where you want to share (e.g. email, WhatsApp).',
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
      toast({ variant: 'destructive', title: 'Cannot share', description: 'Page URL is not available.' });
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
    .filter((a: { status?: string; date?: string }) => a.status === 'scheduled' && a.date && a.date >= today)
    .sort((a: { date?: string; start_time?: string }, b: { date?: string; start_time?: string }) =>
      `${a.date}T${a.start_time || ''}`.localeCompare(`${b.date}T${b.start_time || ''}`)
    )
    .slice(0, 5);

  const healthScore = summaryData?.health_score ?? 85;
  const sourceCounts = summaryData?.source_counts ?? {};
  const recordCount = summaryData?.record_count ?? 0;
  const dateRange = summaryData?.date_range;
  const professionalSummary = summaryData?.professional_summary ?? summaryData?.summary ?? '';
  const professionalFindings = summaryData?.professional_findings ?? [];
  const aiSummary = (professionalSummary || summaryData?.summary) ?? '';
  const bullets = summaryData?.bullets ?? [];
  const recordHighlights = summaryData?.record_highlights ?? [];
  const contentFromRecords = professionalFindings.length > 0 ? professionalFindings : (recordHighlights.length > 0 ? recordHighlights : bullets);
  const aiInsights = summaryData?.ai_insights ?? [];

  const vitalSigns = [
    {
      label: 'Blood Pressure',
      value: '120/80',
      unit: 'mmHg',
      status: 'normal',
      trend: 'stable',
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      lastUpdated: '2 hours ago',
    },
    {
      label: 'Heart Rate',
      value: '72',
      unit: 'bpm',
      status: 'normal',
      trend: 'down',
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
      lastUpdated: '2 hours ago',
    },
    {
      label: 'Temperature',
      value: '98.6',
      unit: '°F',
      status: 'normal',
      trend: 'stable',
      icon: Thermometer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      lastUpdated: '3 hours ago',
    },
    {
      label: 'Weight',
      value: '165',
      unit: 'lbs',
      status: 'normal',
      trend: 'up',
      icon: Weight,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      lastUpdated: '1 day ago',
    },
  ];

  const conditions = summaryData?.conditions ?? [];
  const medications = summaryData?.medications ?? [];

  const allergies = summaryData?.allergies ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-950/20';
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Health Summary</h1>
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Could not load your health summary. Please try again later.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Health Summary</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Your comprehensive health overview powered by AI (from your most recent records)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSummarize}
            disabled={isSummarizing}
            className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all hover:shadow-lg disabled:opacity-70"
          >
            {isSummarizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Summarizing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Summarize my records
              </>
            )}
          </Button>
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
                Copy link
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
                typeof c === 'object' && c !== null && 'name' in c ? { name: c.name } : { name: String(c) }
              ),
              medications: medications.map((m: { name?: string } | string) =>
                typeof m === 'object' && m !== null && 'name' in m ? { name: m.name } : { name: String(m) }
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
      </div>

      {/* Loading: beautiful animation while summarizing */}
      {isSummarizing && (
        <Card className="overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-50/90 to-indigo-50/90 dark:from-purple-950/30 dark:to-indigo-950/30 shadow-lg">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 bg-[length:200%_100%] animate-shimmer" />
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="animate-pulse-soft flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <p className="mt-6 text-lg font-medium text-foreground">Analyzing your records</p>
            <p className="mt-1 text-sm text-muted-foreground">Building your health summary…</p>
            <div className="mt-6 flex gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-purple-500 animate-dot-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="h-2 w-2 rounded-full bg-indigo-500 animate-dot-bounce"
                style={{ animationDelay: '160ms' }}
              />
              <span
                className="h-2 w-2 rounded-full bg-purple-500 animate-dot-bounce"
                style={{ animationDelay: '320ms' }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary from medical records – animated reveal when ready */}
      {!isSummarizing && (aiSummary || contentFromRecords.length > 0 || recordCount > 0) && (
        <Card className="animate-summary-fade border-2 border-purple-200 bg-gradient-to-br from-purple-50/80 to-indigo-50/80 dark:from-purple-950/20 dark:to-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Brain className="h-6 w-6 text-purple-600" />
              AI summary from your medical records
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Generated from lab results, prescriptions, encounters, and documents (most recent by date). Uses extractive summarization and medical entity extraction.
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
                  <Badge variant="outline">Latest: {format(new Date(dateRange.newest), 'MMM d, yyyy')}</Badge>
                )}
              </div>
            )}
            {aiSummary && (
              <p className="text-sm leading-relaxed text-foreground" data-testid="professional-summary">
                {aiSummary}
              </p>
            )}
            {(contentFromRecords.length > 0) && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  {professionalFindings.length > 0 ? 'Key findings' : 'Content from your uploaded records:'}
                </p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {contentFromRecords.map((b, i) => (
                    <li
                      key={i}
                      className="opacity-0 animate-summary-stagger"
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
      )}

      {/* Health Score Card */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-600 p-3">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Overall Health Score
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {recordCount > 0
                      ? `Based on ${recordCount} medical record(s) (labs, prescriptions, encounters, documents)`
                      : 'Based on your vitals, activity, and health records'}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-blue-600">{healthScore}</span>
                  <span className="text-3xl text-gray-500">/100</span>
                </div>
                <Progress value={healthScore} className="mt-4 h-4" />
                <p className="mt-3 text-base font-medium text-green-600">
                  Excellent! Keep up the great work 🎉
                </p>
              </div>
            </div>
            <div className="flex h-36 w-36 flex-shrink-0 items-center justify-center rounded-full border-8 border-blue-600 bg-white dark:bg-gray-900">
              <div className="text-center">
                <Target className="mx-auto h-10 w-10 text-blue-600" />
                <p className="mt-2 text-sm font-medium text-gray-600">On Track</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Vitals & Conditions */}
        <div className="space-y-6 lg:col-span-2">
          {/* Vital Signs */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-6 w-6 text-blue-600" />
                Vital Signs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-6 md:grid-cols-2">
                {vitalSigns.map((vital) => {
                  const Icon = vital.icon;
                  return (
                    <Card key={vital.label} className="border-2 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-1 gap-4">
                            <div className={`flex-shrink-0 rounded-full p-3 ${vital.bgColor}`}>
                              <Icon className={`h-6 w-6 ${vital.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400">
                                {vital.label}
                              </p>
                              <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                  {vital.value}
                                </span>
                                <span className="text-base text-gray-500">{vital.unit}</span>
                              </div>
                              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                {vital.lastUpdated}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">{getTrendIcon(vital.trend)}</div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`mt-4 px-3 py-1 ${getStatusColor(vital.status)}`}
                        >
                          {vital.status.charAt(0).toUpperCase() + vital.status.slice(1)}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Conditions & Medications Tabs */}
          <Tabs defaultValue="conditions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="conditions">Conditions</TabsTrigger>
              <TabsTrigger value="medications">Medications</TabsTrigger>
              <TabsTrigger value="allergies">Allergies</TabsTrigger>
            </TabsList>

            <TabsContent value="conditions" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {conditions.length === 0 && contentFromRecords.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No conditions extracted from your records yet. Add lab results and encounter notes for AI to identify conditions.
                      </p>
                    ) : (
                      <>
                        {conditions.length > 0 && conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex flex-1 gap-4">
                          <div className="mt-1 flex-shrink-0">
                            {condition.status === 'managed' ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : (
                              <AlertCircle className="h-6 w-6 text-yellow-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-semibold leading-relaxed text-gray-900 dark:text-white">
                              {condition.name}
                            </h4>
                            {(condition.diagnosed_date || (condition as any).diagnosed) && (
                              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                Diagnosed: {format(new Date((condition.diagnosed_date || (condition as any).diagnosed) as string), 'MMM d, yyyy')}
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={`px-3 py-1 ${getSeverityColor(condition.severity)}`}
                              >
                                {condition.severity}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 px-3 py-1 text-blue-700"
                              >
                                {condition.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                        ))}
                        {conditions.length === 0 && contentFromRecords.length > 0 && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <p className="mb-2 text-sm font-medium text-foreground">Findings from your uploaded records:</p>
                            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                              {contentFromRecords.slice(0, 10).map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medications" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {medications.length === 0 && contentFromRecords.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No medications extracted from your records yet. Add prescriptions for AI to list medications.
                      </p>
                    ) : (
                      <>
                        {medications.length > 0 && medications.map((med, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between gap-4 rounded-lg border-2 border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950/20"
                      >
                        <div className="flex flex-1 gap-4">
                          <div className="flex-shrink-0 rounded-full bg-green-100 p-3 dark:bg-green-900/30">
                            <Pill className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-base font-semibold leading-relaxed text-gray-900 dark:text-white">
                              {med.name}
                            </h4>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                              {[med.dosage, med.frequency].filter(Boolean).join(' • ') || '—'}
                            </p>
                            {(med.start_date || (med as any).nextDose) && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              {(med as any).nextDose ? `Next dose: ${(med as any).nextDose}` : `Start: ${med.start_date}`}
                            </div>
                            )}
                          </div>
                        </div>
                        <Badge className="flex-shrink-0 bg-green-600 px-3 py-1">Active</Badge>
                      </div>
                        ))}
                        {medications.length === 0 && contentFromRecords.length > 0 && (
                          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                            <p className="mb-2 text-sm font-medium text-foreground">Content from your uploaded records:</p>
                            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                              {contentFromRecords.slice(0, 10).map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allergies" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {allergies.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No allergies on file. Update your profile or add them in Medical Records.
                      </p>
                    ) : allergies.map((allergy, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 rounded-lg border-2 border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950/20"
                      >
                        <div className="flex-shrink-0 rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-semibold leading-relaxed text-gray-900 dark:text-white">
                            {allergy.allergen}
                          </h4>
                          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            Reaction: {allergy.reaction}
                          </p>
                          <Badge
                            variant="outline"
                            className="mt-3 border-red-300 bg-red-100 px-3 py-1 text-red-700"
                          >
                            {allergy.severity} severity
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - AI Insights & Appointments */}
        <div className="space-y-6">
          {/* AI Insights */}
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
                    No insights yet. Add medical records (labs, prescriptions, encounters) to get personalized AI insights.
                  </p>
                ) : (
                  <>
                    {aiInsights.length > 0 && aiInsights.map((insight, index) => (
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
                        <p className="mb-2 text-sm font-medium text-foreground">From your uploaded records:</p>
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

          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6 pt-0">
              {upcomingAppointments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No upcoming appointments. Book one from the Appointments page.
                </p>
              ) : (
                upcomingAppointments.map((apt: { id?: number; date: string; start_time?: string; doctor_name?: string; doctor?: number; specialty?: string }, index: number) => (
                  <div
                    key={apt.id ?? index}
                    className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition-all hover:shadow-md dark:border-blue-800 dark:from-blue-950/30 dark:to-indigo-950/30"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="outline" className="border-blue-300 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        Scheduled
                      </Badge>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(apt.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <h4 className="mb-1 text-base font-bold text-gray-900 dark:text-white">
                      {apt.doctor_name ?? `Doctor #${apt.doctor}`}
                    </h4>
                    <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">{apt.specialty ?? '—'}</p>
                    <div className="flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-800/60">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {apt.start_time ?? '—'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

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
    </div>
  );
}
