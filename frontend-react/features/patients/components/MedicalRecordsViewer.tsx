'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Activity,
  Pill,
  Stethoscope,
  Calendar,
  Loader2,
} from 'lucide-react';
import { getMyFiles, getLabResults, getPrescriptions, getEncounters, uploadFile } from '../api';
import { format, parseISO } from 'date-fns';
import type { MedicalFile, LabResult, Prescription, Encounter } from '@/types/api';

type ViewMode = 'all' | 'lab' | 'prescription' | 'encounter' | 'other';

/**
 * Medical Records Viewer
 * Shows all patient medical records with filtering and upload
 */
export function MedicalRecordsViewer() {
  const [viewMode, setViewMode] = React.useState<ViewMode>('all');
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // Fetch medical files
  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['patient', 'files', viewMode],
    queryFn: () => getMyFiles(viewMode === 'all' ? undefined : viewMode),
  });

  // Fetch lab results
  const { data: labsData, isLoading: labsLoading } = useQuery({
    queryKey: ['patient', 'lab-results'],
    queryFn: getLabResults,
    enabled: viewMode === 'all' || viewMode === 'lab',
  });

  // Fetch prescriptions
  const { data: prescriptionsData, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['patient', 'prescriptions'],
    queryFn: getPrescriptions,
    enabled: viewMode === 'all' || viewMode === 'prescription',
  });

  // Fetch encounters
  const { data: encountersData, isLoading: encountersLoading } = useQuery({
    queryKey: ['patient', 'encounters'],
    queryFn: getEncounters,
    enabled: viewMode === 'all' || viewMode === 'encounter',
  });

  // Upload mutation
  const { mutate: upload } = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: string }) => uploadFile(file, kind),
    onSuccess: () => {
      toast({
        title: 'Upload Successful',
        description: 'Your file has been uploaded successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['patient', 'files'] });
      setUploading(false);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Failed to upload file. Please try again.',
      });
      setUploading(false);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    // You can add a dialog to ask for the file kind
    upload({ file, kind: 'other' });
  };

  const files = filesData?.results || [];
  const labs = labsData?.results || [];
  const prescriptions = prescriptionsData?.results || [];
  const encounters = encountersData?.results || [];

  const isLoading = filesLoading || labsLoading || prescriptionsLoading || encountersLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground">
            View and manage your medical documents and history
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload Document
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b">
        <FilterTab
          icon={FileText}
          label="All Records"
          count={files.length + labs.length + prescriptions.length + encounters.length}
          active={viewMode === 'all'}
          onClick={() => setViewMode('all')}
        />
        <FilterTab
          icon={Activity}
          label="Lab Results"
          count={labs.length}
          active={viewMode === 'lab'}
          onClick={() => setViewMode('lab')}
        />
        <FilterTab
          icon={Pill}
          label="Prescriptions"
          count={prescriptions.length}
          active={viewMode === 'prescription'}
          onClick={() => setViewMode('prescription')}
        />
        <FilterTab
          icon={Stethoscope}
          label="Encounters"
          count={encounters.length}
          active={viewMode === 'encounter'}
          onClick={() => setViewMode('encounter')}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Lab Results */}
          {(viewMode === 'all' || viewMode === 'lab') && labs.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Activity className="h-5 w-5" />
                Lab Results
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {labs.map((lab) => (
                  <LabResultCard key={lab.id} lab={lab} />
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          {(viewMode === 'all' || viewMode === 'prescription') && prescriptions.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Pill className="h-5 w-5" />
                Prescriptions
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {prescriptions.map((prescription) => (
                  <PrescriptionCard key={prescription.id} prescription={prescription} />
                ))}
              </div>
            </div>
          )}

          {/* Encounters */}
          {(viewMode === 'all' || viewMode === 'encounter') && encounters.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Stethoscope className="h-5 w-5" />
                Doctor Encounters
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {encounters.map((encounter) => (
                  <EncounterCard key={encounter.id} encounter={encounter} />
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {(viewMode === 'all' || viewMode === 'other') && files.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FileText className="h-5 w-5" />
                Documents
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {files.map((file) => (
                  <FileCard key={file.id} file={file} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {files.length === 0 &&
            labs.length === 0 &&
            prescriptions.length === 0 &&
            encounters.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    <p className="font-medium">No records found</p>
                    <p className="mt-1 text-sm">Upload your first document to get started</p>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}

// ========================================
// Component: FilterTab
// ========================================
function FilterTab({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-2 transition-colors ${
        active
          ? 'border-primary font-medium text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <Badge variant="secondary" className="ml-1">
        {count}
      </Badge>
    </button>
  );
}

// ========================================
// Component: LabResultCard
// ========================================
function LabResultCard({ lab }: { lab: LabResult }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{lab.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(lab.ts), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge variant="info">Lab</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {lab.summary && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{lab.summary}</p>
        )}
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          View Results
        </Button>
      </CardContent>
    </Card>
  );
}

// ========================================
// Component: PrescriptionCard
// ========================================
function PrescriptionCard({ prescription }: { prescription: Prescription }) {
  const doctor = prescription.doctor_details;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Prescription by {doctor ? `Dr. ${doctor.name}` : 'Doctor'}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(prescription.ts), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge variant="success">Prescription</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 space-y-2">
          {prescription.items.slice(0, 2).map((item, index) => (
            <div key={index} className="text-sm">
              <p className="font-medium">{item.drug}</p>
              <p className="text-xs text-muted-foreground">
                {item.dosage} - {item.duration}
              </p>
            </div>
          ))}
          {prescription.items.length > 2 && (
            <p className="text-xs text-muted-foreground">
              +{prescription.items.length - 2} more medications
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          View Full Prescription
        </Button>
      </CardContent>
    </Card>
  );
}

// ========================================
// Component: EncounterCard
// ========================================
function EncounterCard({ encounter }: { encounter: Encounter }) {
  const doctor = encounter.doctor_details;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Visit with {doctor ? `Dr. ${doctor.name}` : 'Doctor'}
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(encounter.ts), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge variant="warning">Encounter</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {encounter.diagnosis && (
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground">Diagnosis</p>
            <p className="line-clamp-2 text-sm">{encounter.diagnosis}</p>
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

// ========================================
// Component: FileCard
// ========================================
function FileCard({ file }: { file: MedicalFile }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{file.filename}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(file.created_at), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge variant="outline">{file.kind}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
