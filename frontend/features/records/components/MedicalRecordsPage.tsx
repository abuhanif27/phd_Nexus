'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  FileText,
  Download,
  Calendar,
  Pill,
  FlaskConical,
  Stethoscope,
  Search,
  Filter,
  Upload,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  getMedicalFiles,
  getLabResults,
  getPrescriptions,
  getEncounters,
  getMedicalFileLink,
  getMedicalFileBlob,
  deleteMedicalFile,
} from '@/features/records/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import type { RecordType } from '@/features/records/types';

export function MedicalRecordsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<RecordType>('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all records
  const { data: filesData, isLoading: loadingFiles } = useQuery({
    queryKey: ['medical-files'],
    queryFn: () => getMedicalFiles(),
  });

  const { data: labResultsData, isLoading: loadingLabs } = useQuery({
    queryKey: ['lab-results'],
    queryFn: () => getLabResults(),
  });

  const { data: prescriptionsData, isLoading: loadingPrescriptions } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => getPrescriptions(),
  });

  const { data: encountersData, isLoading: loadingEncounters } = useQuery({
    queryKey: ['encounters'],
    queryFn: () => getEncounters(),
  });

  const files = filesData?.results || [];
  const labResults = labResultsData?.results || [];
  const prescriptions = prescriptionsData?.results || [];
  const encounters = encountersData?.results || [];

  const isLoading = loadingFiles || loadingLabs || loadingPrescriptions || loadingEncounters;

  // Filter records based on search
  const filteredFiles = files.filter((file) =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLabs = labResults.filter((lab) =>
    lab.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrescriptions = prescriptions.filter(
    (rx) =>
      rx.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.items.some((item) => item.drug.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredEncounters = encounters.filter(
    (enc) =>
      enc.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enc.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const stats = [
    {
      label: 'Lab Results',
      value: labResults.length,
      icon: FlaskConical,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: 'Prescriptions',
      value: prescriptions.length,
      icon: Pill,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      label: 'Encounters',
      value: encounters.length,
      icon: Stethoscope,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      label: 'Documents',
      value: files.length,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage your health records
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/dashboard/records/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-none shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filter */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search records by name, doctor, or diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as RecordType)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="lab">Lab Results</TabsTrigger>
          <TabsTrigger value="prescription">Prescriptions</TabsTrigger>
          <TabsTrigger value="encounter">Encounters</TabsTrigger>
          <TabsTrigger value="file">Documents</TabsTrigger>
        </TabsList>

        {/* All Records */}
        <TabsContent value="all" className="space-y-4">
          <AllRecordsTab
            labResults={filteredLabs}
            prescriptions={filteredPrescriptions}
            encounters={filteredEncounters}
            files={filteredFiles}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Lab Results */}
        <TabsContent value="lab">
          <LabResultsTab labResults={filteredLabs} isLoading={loadingLabs} />
        </TabsContent>

        {/* Prescriptions */}
        <TabsContent value="prescription">
          <PrescriptionsTab
            prescriptions={filteredPrescriptions}
            isLoading={loadingPrescriptions}
          />
        </TabsContent>

        {/* Encounters */}
        <TabsContent value="encounter">
          <EncountersTab encounters={filteredEncounters} isLoading={loadingEncounters} />
        </TabsContent>

        {/* Documents */}
        <TabsContent value="file">
          <DocumentsTab files={filteredFiles} isLoading={loadingFiles} toast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// All Records Tab Component
function AllRecordsTab({ labResults, prescriptions, encounters, files, isLoading }: any) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-600">Loading records...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const allRecords = [
    ...labResults.map((r: any) => ({ ...r, type: 'lab' })),
    ...prescriptions.map((r: any) => ({ ...r, type: 'prescription' })),
    ...encounters.map((r: any) => ({ ...r, type: 'encounter' })),
    ...files.map((r: any) => ({ ...r, type: 'file' })),
  ].sort(
    (a, b) => new Date(b.ts || b.created_at).getTime() - new Date(a.ts || a.created_at).getTime()
  );

  if (allRecords.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <FileText className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-600">No records found</p>
          <p className="text-xs text-gray-400">Upload your first document to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {allRecords.map((record: any, index) => (
        <RecordCard key={`${record.type}-${record.id}-${index}`} record={record} />
      ))}
    </div>
  );
}

// Lab Results Tab
function LabResultsTab({ labResults, isLoading }: any) {
  if (isLoading) {
    return <div className="py-12 text-center">Loading lab results...</div>;
  }

  if (labResults.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <FlaskConical className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-600">No lab results found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {labResults.map((lab: any) => (
        <Card key={lab.id} className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/20">
                  <FlaskConical className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{lab.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{lab.summary}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(lab.ts), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Prescriptions Tab
function PrescriptionsTab({ prescriptions, isLoading }: any) {
  if (isLoading) {
    return <div className="py-12 text-center">Loading prescriptions...</div>;
  }

  if (prescriptions.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <Pill className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-600">No prescriptions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((rx: any) => (
        <Card key={rx.id} className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/20">
                  <Pill className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Prescription</h3>
                  {rx.doctor_name && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Dr. {rx.doctor_name}
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    {rx.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">{item.drug}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.dosage} • {item.duration}
                        </p>
                        {item.instructions && (
                          <p className="mt-1 text-xs text-gray-500">{item.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(rx.ts), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Encounters Tab
function EncountersTab({ encounters, isLoading }: any) {
  if (isLoading) {
    return <div className="py-12 text-center">Loading encounters...</div>;
  }

  if (encounters.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <Stethoscope className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm font-medium text-gray-600">No encounters found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {encounters.map((enc: any) => (
        <Card key={enc.id} className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-950/20">
                  <Stethoscope className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Medical Encounter</h3>
                  {enc.doctor_name && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Dr. {enc.doctor_name}
                    </p>
                  )}
                  {enc.diagnosis && (
                    <div className="mt-3">
                      <Badge variant="outline" className="mb-2 bg-purple-50 text-purple-700">
                        Diagnosis
                      </Badge>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{enc.diagnosis}</p>
                    </div>
                  )}
                  {enc.plan && (
                    <div className="mt-3">
                      <Badge variant="outline" className="mb-2 bg-blue-50 text-blue-700">
                        Treatment Plan
                      </Badge>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{enc.plan}</p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(enc.ts), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Documents Tab
function DocumentsTab({
  files,
  isLoading,
  toast,
}: {
  files: any[];
  isLoading: boolean;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const queryClient = useQueryClient();
  const [viewFile, setViewFile] = useState<{
    id: number;
    filename: string;
    mime?: string;
  } | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: deleteMedicalFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-files'] });
      toast({ title: 'Deleted', description: 'Document removed.' });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err?.response?.data?.error || 'Please try again.',
      });
    },
  });

  const handleDownload = async (fileId: number) => {
    try {
      const { url } = await getMedicalFileLink(fileId);
      window.open(url, '_blank');
    } catch {
      toast({ variant: 'destructive', title: 'Could not get download link.' });
    }
  };

  const handleView = async (file: { id: number; filename: string; mime?: string }) => {
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

  const closeView = () => {
    if (viewUrl) URL.revokeObjectURL(viewUrl);
    setViewFile(null);
    setViewUrl(null);
  };

  const isImage = (file: { mime?: string; filename: string }) => {
    const mime = (file.mime || '').toLowerCase();
    const name = (file.filename || '').toLowerCase();
    if (mime.startsWith('image/')) return true;
    return /\.(jpg|jpeg|png|gif|webp|bmp|heic)$/.test(name);
  };

  const isPdf = (file: { mime?: string; filename: string }) => {
    const mime = (file.mime || '').toLowerCase();
    const name = (file.filename || '').toLowerCase();
    return mime === 'application/pdf' || name.endsWith('.pdf');
  };

  const handleDelete = (fileId: number) => {
    if (typeof window !== 'undefined' && window.confirm('Remove this document?')) {
      deleteMutation.mutate(fileId);
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading documents...</div>;
  }

  if (files.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="flex h-64 flex-col items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">No documents found</p>
          <p className="text-xs text-muted-foreground">Upload your first document to get started</p>
          <Button className="mt-4" variant="default" asChild>
            <Link href="/dashboard/records/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {files.map((file: any) => (
        <Card key={file.id} className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{file.filename}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <Badge variant="outline">{file.kind}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {file.size != null ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(file.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(file)}
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file.id)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(file.id)}
                  disabled={deleteMutation.isPending}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* View dialog – same UI as app */}
      <Dialog open={!!viewFile} onOpenChange={(open) => !open && closeView()}>
        <DialogContent className="max-w-3xl border bg-background shadow-lg sm:rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              {viewFile?.filename}
            </DialogTitle>
            <DialogDescription>View document</DialogDescription>
          </DialogHeader>
          <div className="min-h-[200px]">
            {viewLoading && (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading…
              </div>
            )}
            {!viewLoading && viewUrl && viewFile && (
              <>
                {isImage(viewFile) && (
                  <div className="rounded-lg border bg-muted/30 p-2">
                    <img
                      src={viewUrl}
                      alt={viewFile.filename}
                      className="max-h-[70vh] w-full rounded-md object-contain"
                    />
                  </div>
                )}
                {isPdf(viewFile) && (
                  <div className="rounded-lg border bg-muted/30 p-2">
                    <iframe
                      src={viewUrl}
                      title={viewFile.filename}
                      className="h-[70vh] w-full rounded-md border-0"
                    />
                  </div>
                )}
                {!isImage(viewFile) && !isPdf(viewFile) && (
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

// Record Card Component
function RecordCard({ record }: any) {
  const getRecordIcon = () => {
    switch (record.type) {
      case 'lab':
        return { icon: FlaskConical, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' };
      case 'prescription':
        return { icon: Pill, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' };
      case 'encounter':
        return {
          icon: Stethoscope,
          color: 'text-purple-600',
          bg: 'bg-purple-50 dark:bg-purple-950/20',
        };
      case 'file':
        return {
          icon: FileText,
          color: 'text-orange-600',
          bg: 'bg-orange-50 dark:bg-orange-950/20',
        };
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-950/20' };
    }
  };

  const { icon: Icon, color, bg } = getRecordIcon();

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {record.title || record.filename || 'Medical Record'}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {record.summary || record.notes || record.kind}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {format(new Date(record.ts || record.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
