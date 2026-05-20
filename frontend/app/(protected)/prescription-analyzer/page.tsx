'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMedicalFiles, parsePrescriptionImage } from '@/features/records/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pill, FileText, Search, Loader2, AlertCircle, Sparkles, Upload, Calendar, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
export default function PrescriptionAnalyzerPage() {
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [selectedExistingFile, setSelectedExistingFile] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Fetch all medical files
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['medical-files', 'all'],
    queryFn: () => getMedicalFiles(),
    select: (data: any) => {
      const allFiles = data.results || [];
      // Sort heavily by date so latest is first
      return [...allFiles].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: (data: { fileObj?: File, fileId?: number }) => 
        parsePrescriptionImage(data.fileId, data.fileObj),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFileObj(file);
      setSelectedExistingFile(null); // Clear existing selection
      analyzeMutation.reset();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExistingFileSelect = useCallback((file: any) => {
      setSelectedExistingFile(file);
      setSelectedFileObj(null); // Clear custom upload
      analyzeMutation.reset();
      
      // We can use the serve endpoint for preview
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      setPreview(`${API_URL}/api/records/files/${file.id}/serve/?token=${token}`);
  }, [analyzeMutation]);

  // Auto-select the most likely recent prescription when files load
  useEffect(() => {
    if (files && files.length > 0 && !selectedExistingFile && !selectedFileObj) {
      const likelyPrescription = files.find((f: any) => 
        f.kind === 'prescription' || 
        (f.classification_note && f.classification_note.toLowerCase().includes('prescription'))
      ) || files[0];
      
      handleExistingFileSelect(likelyPrescription);
    }
  }, [files, selectedExistingFile, selectedFileObj, handleExistingFileSelect]);

  const handleAnalyze = () => {
    if (selectedFileObj) {
      analyzeMutation.mutate({ fileObj: selectedFileObj });
    } else if (selectedExistingFile) {
      analyzeMutation.mutate({ fileId: selectedExistingFile.id });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Pill className="h-6 w-6 text-white" />
            </div>
            Prescription Analysis
          </h1>
          <p className="mt-2 text-muted-foreground max-w-lg">
            Our AI automatically identifies medications and schedules from your documents to help you stay on track with your health.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <Card className="overflow-hidden shadow-md border-0 ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Upload Document</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <FileText className="h-4 w-4 mr-2" />
                      Saved Records
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <DropdownMenuLabel>Your Medical Records</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="max-h-64 overflow-y-auto">
                      {filesLoading ? (
                        <div className="p-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                      ) : files?.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No documents found</div>
                      ) : (
                        files?.map((file: any) => {
                            const isPrescription = file.kind === 'prescription' || (file.classification_note && file.classification_note.toLowerCase().includes('prescription'));
                            return (
                              <DropdownMenuItem 
                                key={file.id} 
                                onClick={() => handleExistingFileSelect(file)}
                                className={`flex items-center justify-between py-2 cursor-pointer ${isPrescription ? 'font-medium' : 'opacity-80'} ${selectedExistingFile?.id === file.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                              >
                                <div className="min-w-0 pr-4 flex items-center gap-2">
                                  {selectedExistingFile?.id === file.id ? <Check className="h-3 w-3 text-blue-600" /> : <div className="w-3" />}
                                  <div className="truncate text-sm">{file.filename}</div>
                                </div>
                                <Badge variant={isPrescription ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-4 capitalize shrink-0 ml-2">
                                  {file.kind}
                                </Badge>
                              </DropdownMenuItem>
                            );
                        })
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all relative aspect-[4/3] flex flex-col justify-center overflow-hidden">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  accept="image/*,.pdf" 
                  onChange={handleFileChange}
                />
                {preview ? (
                    <div className="absolute inset-0 w-full h-full bg-white dark:bg-black rounded-lg overflow-hidden group">
                       {selectedFileObj?.name.toLowerCase().endsWith('.pdf') || selectedExistingFile?.filename.toLowerCase().endsWith('.pdf') ? (
                           <iframe src={preview} className="w-full h-full border-0" title="Document Preview" />
                       ) : (
                           <div className="relative w-full h-full">
                             <Image 
                               src={preview} 
                               alt="Preview" 
                               fill 
                               className="object-contain" 
                               unoptimized
                             />
                           </div>
                       )}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                         <Upload className="h-8 w-8 text-white" />
                       </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center pointer-events-none space-y-2">
                      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full">
                        <Upload className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-sm font-semibold">Drop prescription here</p>
                      <p className="text-xs text-muted-foreground">Supports JPG, PNG and PDF</p>
                    </div>
                )}
              </div>
              
              <Button 
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20" 
                  onClick={handleAnalyze} 
                  disabled={analyzeMutation.isPending || (!selectedFileObj && !selectedExistingFile)}
                  >
                  {analyzeMutation.isPending ? (
                      <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                      </>
                  ) : (
                      <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Analysis
                      </>
                  )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card className="h-full shadow-md border-0 ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Health Insights
                </CardTitle>
                {analyzeMutation.isSuccess && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Check className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
               {analyzeMutation.isPending && (
                  <div className="py-20 flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-10"></div>
                      <div className="bg-white dark:bg-gray-900 p-4 rounded-full relative border border-blue-100 dark:border-blue-900 shadow-xl">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-base font-semibold text-blue-600">Deep scanning your document</p>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Extracting medical entities and cross-referencing with our knowledge base.
                      </p>
                    </div>
                  </div>
               )}

               {analyzeMutation.isError && (
                   <div className="p-6 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900 flex items-start gap-4">
                       <AlertCircle className="h-6 w-6 shrink-0" />
                       <div className="space-y-1">
                          <p className="font-bold">Analysis interrupted</p>
                          <p className="text-sm opacity-90">{analyzeMutation.error instanceof Error ? analyzeMutation.error.message : 'We couldn\'t process this document. Please try again or use a clearer image.'}</p>
                       </div>
                   </div>
               )}

               {analyzeMutation.isSuccess && analyzeMutation.data && (
                   <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                      {/* Treatment Header */}
                      <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 p-4 rounded-xl border bg-white dark:bg-gray-950 shadow-sm flex items-center gap-4">
                              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-full">
                                <Calendar className="h-6 w-6 text-blue-600" />
                              </div>
                              <div>
                                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Prescribed On</p>
                                  <p className="text-lg font-bold">{(analyzeMutation.data as any).extracted_date}</p>
                              </div>
                          </div>
                      </div>

                      {/* Medications */}
                      <div className="space-y-4">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1">Prescribed Regimen</h3>
                          {((analyzeMutation.data as any).medicines || []).length > 0 ? (
                              <div className="grid gap-4 sm:grid-cols-2">
                                  {((analyzeMutation.data as any).medicines || []).map((med: any, idx: number) => (
                                      <div key={idx} className="group p-4 bg-white dark:bg-gray-950 border rounded-xl shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="bg-blue-600/10 text-blue-600 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Pill className="h-4 w-4" />
                                              </div>
                                              <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-800">
                                                  {med.frequency}
                                              </Badge>
                                          </div>
                                          <div className="space-y-1">
                                              <p className="font-bold text-lg leading-tight">{med.drug_name}</p>
                                              <p className="text-sm text-muted-foreground">{med.dosage} for {med.duration_days} days</p>
                                          </div>
                                          {med.purpose && (
                                            <div className="mt-4 pt-4 border-t border-dashed">
                                              <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                                                {med.purpose}
                                              </p>
                                            </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="p-8 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                  <p className="text-sm">No specific medications were clearly identified.</p>
                                  <p className="text-xs mt-1">Try uploading a higher resolution photo.</p>
                              </div>
                          )}
                      </div>
                      
                      {/* Mobile App Sync Note */}
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900 rounded-xl flex items-center gap-4">
                        <div className="bg-white dark:bg-gray-900 p-2 rounded-lg shadow-sm">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Medication Reminders</p>
                          <p className="text-xs text-blue-800/70 dark:text-blue-400/70">
                            Automatic alarms have been synced to your PhD Nexus mobile app based on this analysis.
                          </p>
                        </div>
                      </div>
                   </div>
               )}

               {!analyzeMutation.isPending && !analyzeMutation.isSuccess && !analyzeMutation.isError && (
                   <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed">
                       <div className="bg-white dark:bg-gray-900 p-6 rounded-full shadow-sm mb-6 border">
                        <Search className="h-12 w-12 text-blue-600/20" />
                       </div>
                       <h3 className="text-lg font-semibold mb-2">Awaiting Document</h3>
                       <p className="text-sm text-muted-foreground max-w-xs">
                         Select a prescription to begin the clinical analysis and sync reminders to your mobile device.
                       </p>
                   </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
