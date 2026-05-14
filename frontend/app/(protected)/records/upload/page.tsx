'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import { uploadMedicalFile } from '@/features/records/api';
import { useToast } from '@/components/ui/use-toast';

const KINDS = [
  { value: 'lab', label: 'Lab result' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'encounter', label: 'Encounter note' },
  { value: 'other', label: 'Other document' },
] as const;

export default function UploadRecordsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<string>('other');

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadMedicalFile(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-files'] });
      toast({ title: 'Uploaded', description: 'Your document has been uploaded.' });
      router.push('/dashboard/records');
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err?.response?.data?.error || err?.message || 'Please try again.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Select a file',
        description: 'Choose a file to upload.',
      });
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);
    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/records">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Records</h1>
          <p className="text-sm text-muted-foreground">Add lab results or documents</p>
        </div>
      </div>

      <Card className="mx-auto max-w-lg border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            Add document
          </CardTitle>
          <CardDescription>
            Upload a PDF, image, or document. Lab and prescription files may be processed for data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="kind">Document type</Label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
              {file && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
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
                    Upload
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
