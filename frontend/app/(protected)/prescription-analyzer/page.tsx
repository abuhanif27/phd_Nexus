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
      // In NextJS env variables:
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
      setPreview(`${API_URL}/api/records/files/${file.id}/serve/?token=${token}`);
  }, [analyzeMutation]);

  // Auto-select the most likely recent prescription when files load
  useEffect(() => {
    if (files && files.length > 0 && !selectedExistingFile && !selectedFileObj) {
      // Find the most recent file that is either tagged as prescription OR auto-classified as prescription
      const likelyPrescription = files.find((f: any) => 
        f.kind === 'prescription' || 
        (f.classification_note && f.classification_note.toLowerCase().includes('prescription'))
      ) || files[0]; // Fallback to absolute latest file
      
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Pill className="h-8 w-8 text-blue-600" />
          Prescription Analyzer (ClinicalBERT + TrOCR)
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Upload or select an existing document to automatically extract medications, dosages, and deadlines.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Document</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    {selectedExistingFile ? 'Browse Existing' : 'Select Existing'}
                    <ChevronDown className="h-4 w-4" />
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
            {selectedExistingFile && (
                <div className="mt-2 text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded-md flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="truncate">Selected: {selectedExistingFile.filename}</span>
                </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative h-64 flex flex-col justify-center">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                accept="image/*,.pdf" 
                onChange={handleFileChange}
              />
              {preview ? (
                  <div className="absolute inset-0 w-full h-full p-2 bg-gray-50 dark:bg-gray-900 rounded">
                     {selectedFileObj?.name.toLowerCase().endsWith('.pdf') || selectedExistingFile?.filename.toLowerCase().endsWith('.pdf') ? (
                         <iframe src={preview} className="w-full h-full rounded border-0" title="PDF Preview" />
                     ) : (
                         <div className="relative w-full h-full">
                           <Image 
                             src={preview} 
                             alt="Preview" 
                             fill 
                             className="object-contain rounded" 
                             unoptimized
                           />
                         </div>
                     )}
                     {!selectedExistingFile && (
                         <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-xs px-2 py-1 rounded shadow text-gray-700 font-medium z-20 pointer-events-none">
                            New Upload
                         </div>
                     )}
                  </div>
              ) : (
                  <div className="flex flex-col items-center pointer-events-none">
                    <Upload className="h-10 w-10 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 font-medium">Click or drag prescription here</p>
                    <p className="text-xs text-gray-400 mt-1">Or select an existing document from above</p>
                  </div>
              )}
            </div>
            
            <Button 
                className="w-full" 
                onClick={handleAnalyze} 
                disabled={analyzeMutation.isPending || (!selectedFileObj && !selectedExistingFile)}
                >
                {analyzeMutation.isPending ? (
                    <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Colab Models...
                    </>
                ) : (
                    <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {selectedExistingFile ? 'Analyze Document' : 'Analyze New Upload'}
                    </>
                )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card className="md:col-span-1 border-blue-200 dark:border-blue-900 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Pill className="w-48 h-48" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Extraction Results
            </CardTitle>
            <CardDescription>
              {analyzeMutation.isSuccess 
                  ? "AI extraction completed successfully" 
                  : "Upload or select a file to see extracted medications"}
            </CardDescription>
          </CardHeader>
          <CardContent>
             {analyzeMutation.isPending && (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin relative" />
                  </div>
                  <p className="text-sm font-medium animate-pulse text-blue-600 text-center">
                    Running EasyOCR (GPU)...<br/>
                    Applying ClinicalBERT Tokenizer...
                  </p>
                </div>
             )}

             {analyzeMutation.isError && (
                 <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 flex items-start gap-3">
                     <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                     <div className="text-sm">
                        <p className="font-medium">Extraction failed</p>
                        <p className="opacity-90">{analyzeMutation.error instanceof Error ? analyzeMutation.error.message : 'Unknown error occurred'}</p>
                     </div>
                 </div>
             )}

             {analyzeMutation.isSuccess && analyzeMutation.data && (
                 <div className="space-y-6">
                    {/* Dates */}
                    {(analyzeMutation.data as any).extracted_date && (
                        <div className="flex gap-4">
                            <div className="bg-gray-50 border rounded-lg p-3 flex-1 flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-gray-500" />
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Prescription Date</p>
                                    <p className="text-sm font-bold">{(analyzeMutation.data as any).extracted_date}</p>
                                </div>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex-1 flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <div>
                                    <p className="text-xs text-red-500 font-medium uppercase tracking-wider">Device Alarms Until</p>
                                    <p className="text-sm font-bold text-red-700">{(analyzeMutation.data as any).expires_at}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Medications */}
                    <div>
                        <h3 className="text-sm font-semibold mb-3 tracking-tight">Extracted Medications</h3>
                        {((analyzeMutation.data as any).medicines || []).length > 0 ? (
                            <div className="space-y-3">
                                {((analyzeMutation.data as any).medicines || []).map((med: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 border rounded-lg shadow-sm">
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {med.drug_name}
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200">
                                                    {med.frequency}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">Dosage: {med.dosage} for {med.duration_days} days</p>
                                        </div>
                                            {med.purpose && <p className="text-xs text-blue-600/80 bg-blue-50/50 p-1.5 rounded mt-1.5 border border-blue-50"><strong className="font-semibold">Action/Purpose:</strong> {med.purpose}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-center text-sm text-gray-500">
                                {((analyzeMutation.data as any).raw_ocr) ? 
                                    "No specific medicines matched, but text was successfully OCR'd." : "No text detected in image."}
                            </div>
                        )}
                    </div>
                    
                    
                    {/* Doctor's Advice Highlight */}
                    {(analyzeMutation.data as any).doctor_advice && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg shadow-sm">
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-500 flex items-center gap-2 mb-1.5">
                                💡 Doctor's Important Advice
                            </h3>
                            <p className="text-sm text-amber-900 dark:text-amber-400 italic">
                                "{(analyzeMutation.data as any).doctor_advice}"
                            </p>
                        </div>
                    )}
                 </div>
             )}

             {!analyzeMutation.isPending && !analyzeMutation.isSuccess && !analyzeMutation.isError && (
                 <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-400 dark:text-gray-500">
                     <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
                     <p className="text-sm font-medium mb-1">Awaiting Document</p>
                     <p className="text-xs opacity-70">Results will be streamed from the remote Google Colab GPU node once you trigger the analysis.</p>
                 </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
