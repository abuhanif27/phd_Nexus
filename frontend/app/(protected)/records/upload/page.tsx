'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, ArrowLeft, Loader2, X, CheckCircle2, CloudUpload } from 'lucide-react';
import { uploadMedicalFile } from '@/features/records/api';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils/cn';

const KINDS = [
  { value: 'lab', label: 'Lab result' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'encounter', label: 'Encounter note' },
  { value: 'other', label: 'Other document' },
] as const;

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.heic,.doc,.docx';

export default function UploadRecordsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<string>('other');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + 10));
      }, 200);
      return uploadMedicalFile(formData).finally(() => {
        clearInterval(interval);
        setProgress(100);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-files'] });
      toast({ title: 'Uploaded', description: 'Your document has been uploaded successfully.' });
      router.push('/dashboard/records');
    },
    onError: (err: any) => {
      setProgress(0);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err?.response?.data?.error || err?.message || 'Please try again.',
      });
    },
  });

  const handleFile = useCallback((f: File | null) => {
    if (f) setFile(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/dashboard/records">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Records</h1>
          <p className="text-sm text-muted-foreground">Add lab results, prescriptions, or documents</p>
        </div>
      </div>

      <Card className="mx-auto max-w-xl border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <CloudUpload className="h-5 w-5 text-primary" />
            </div>
            Upload Document
          </CardTitle>
          <CardDescription>
            Supported formats: PDF, JPG, PNG, HEIC, DOC, DOCX
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Drag & Drop Zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop file here or click to browse"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200',
                dragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                file && 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
                aria-hidden="true"
              />

              {file ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="font-medium text-sm">{file.name}</p>
                  <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-muted-foreground"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setProgress(0); }}
                  >
                    <X className="mr-1 h-3 w-3" /> Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      <span className="text-primary">Click to browse</span> or drag & drop
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      PDF, JPG, PNG, HEIC, DOC up to 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Progress */}
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading…</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="kind">Document type</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger id="kind">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button
                type="submit"
                disabled={!file || uploadMutation.isPending}
                className="w-full sm:flex-1"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/dashboard/records">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
