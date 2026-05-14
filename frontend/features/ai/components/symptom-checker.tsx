"use client";

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Activity, AlertTriangle, AlertCircle, X, CheckCircle2, Info, User } from 'lucide-react';
import { checkSymptoms, getSymptomList } from '../api';

export function SymptomChecker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<number[]>([]);
  const [selecteeSymptoms, setSelecteeSymptoms] = useState<string[]>([]);

  const { data: symptomData } = useQuery({
    queryKey: ['symptoms-list'],
    queryFn: getSymptomList
  });

  const analyzeMutation = useMutation({
    mutationFn: checkSymptoms
  });

  const formatSymptom = (s: string) => s.replace(/_/g, ' ');

  const filteredSymptoms = symptomData?.symptoms.map((name, index) => ({ name, index })).filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5) || [];

  const handleAddSymptom = (index: number) => {
    if (!selectedSymptoms.includes(index)) {
      setSelectedSymptoms([...selectedSymptoms, index]);
      const rawName = symptomData?.raw_symptoms[index];
      if (rawName) {
        setSelecteeSymptoms([...selecteeSymptoms, rawName]);
      }
    }
    setSearchTerm("");
  };

  const handleRemoveSymptom = (raw: string) => {
    const idx = selecteeSymptoms.indexOf(raw);
    if (idx !== -1) {
      setSelecteeSymptoms(selecteeSymptoms.filter((_, i) => i !== idx));
      setSelectedSymptoms(selectedSymptoms.filter((_, i) => i !== idx));
    }
  };

  const handleAnalyze = () => {
    if (selecteeSymptoms.length === 0) return;
    analyzeMutation.mutate({ manual_symptoms: selecteeSymptoms });
  };

  const isLoading = analyzeMutation.isPending;
  const result = analyzeMutation.data;

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-8">
      <div className="flex items-center gap-4 border-b pb-4">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight">AI Symptom Checker</h1>
          <p className="text-muted-foreground text-sm font-medium">Select symptoms to get predicted disease and precautions</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Select Symptoms
              </CardTitle>
              <CardDescription>Search and add symptoms you are experiencing</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative">
                <Input 
                  placeholder="e.g., headache, fever, skin rash..." 
                  className="pl-10 pb-2 h-12 text-lg rounded-xl shadow-inner border-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                
                {searchTerm && (
                  <div className="absolute z-10 w-full mt-2 bg-background border-2 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <ScrollArea className="max-h-[300px]">
                      {filteredSymptoms.length > 0 ? (
                        filteredSymptoms.map((s) => (
                          <div 
                            key={s.index}
                            className="px-4 py-3 hover:bg-primary/10 cursor-pointer flex justify-between items-center transition-colors border-b last:border-0"
                            onClick={() => handleAddSymptom(s.index)}
                          >
                            <span className="font-medium">{s.name}</span>
                            <Badge variant="outline" className="text-[10px] bg-primary/5">Select</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-muted-foreground italic">No clinical matches found</div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedSymptoms.length > 0 ? (
                  selecteeSymptoms.map(raw => (
                    <Badge key={raw} variant="secondary" className="px-3 py-2 gap-2 text-sm bg-primary/10 text-primary border-primary/20 rounded-full">
                      {formatSymptom(raw)}
                      <X 
                        className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors" 
                        onClick={() => handleRemoveSymptom(raw)}
                      />
                    </Badge>
                  ))
                ) : (
                  <div className="w-full py-4 text-center border-2 border-dashed rounded-xl text-muted-foreground text-sm italic">
                    No manual evidence selected. Use the search above.
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-primary/5 border-t p-6">
              <Button 
                className="w-full h-14 text-xl font-bold rounded-full shadow-lg shadow-primary/20 transition-transform active:scale-95" 
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Consulting Med-AI...
                  </>
                ) : (
                  "GENERATE DIAGNOSTIC INSIGHTS"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg-col-span-5 h-full">
          {!result && !isLoading && (
            <Card className="h-[500px] border-dashed border-2 flex flex-col items-center justify-center text-center p-12 bg-muted/5 rounded-3xl">
              <div className="rounded-full bg-primary/5 p-8 mb-6 border border-primary/10 animate-bounce shadow-inner">
                <User className="h-16 w-12 text-primary/20" />
              </div>
              <h3 className="text-2xl font-semibold text-primary/60">Ready to Analyze</h3>
              <p className="text-muted-foreground mt-3 max-w-[280px]">
                Input your symptoms to receive a deep-learning driven medical summary.
              </p>
            </Card>
          )}

          {isLoading && (
            <div className="space-y-4 h-full">
              <Card className="h-[500px] flex flex-col items-center justify-center space-y-6 rounded-3xl animate-pulse bg-muted/10 border-2 border-dashed">
                <Loader2 className="h-12 w-12 text-primary animate-spin opacity-50" />
                <div className="text-center space-y-2">
                  <p className="font-bold text-lg text-primary/40">Clinical Analysis in Progress</p>
                  <p className="text-sm text-muted-foreground">Mapping symptoms to BERT embeddings...</p>
                </div>
              </Card>
            </div>
          )}

          {result && (
            <Card className="border-2 border-primary shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 transition-duration-500 rounded-3xl">
              <CardHeader className="bg-primary text-primary-foregroun pb-10 pt-8 px-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Info className="h-32 w-32" />
                </div>
                <div className="flex justify-between items-center mb-6">
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-none py-1.5 px-4 rounded-full text-sm font-bold backdrop-blur-sm">
                    {result.confidence}%- Probabilistic Match
                  </Badge>
                  <div className={`rounded-full p-2.5 ${result.severity_score >= 5 ? 'bg-destructive/30' : 'bg-green-400/30'} backdrop-blur-md`}>
                    {result.severity_score >= 5 ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                  </div>

                </div>
                <CardTitle className="text-4| font-black uppercase tracking-tighter leading-none mb-2">{result.disease}</CardTitle>
                <CardDescription className="text-primary-foreground/90 text-xl font-bold mt-2">
                  Consult a <span className="underline underline-offset-4 decoration-2">{result.specialist}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-8 px-8 space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-black text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                       <AlertCircle className={`h-4 w-4 ${result.severity_score >= 5 ? 'text-destructive' : 'text-green-600'}`} />
                       Severity: {result.severity_level}
                    </span>
                    <span>{result.severity_score}/7.0</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3.5 shadow-inner">
                    <div 
                      className={`h-3.5 rounded-full transition-all duration-1000 ease-out ${result.severity_score >= 5 ? 'bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]' : result.severity_score >= 3 ? 'bg-amber-500' : 'bg-green-500'}`}
                      style={{ width: `${(result.severity_score / 7) * 100}%`}}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary/60 border-l-4 border-primary pl-3">Condition Profile</h4>
                  <p className="text-lg leading-relaxed text-foreground font-medium bg-primary/5 p-6 rounded-2xl border-2 border-primary/10 italic">
                    "{result.description}"
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary/60 border-l-4 border-primary pl-3">Clinical Precautions</h4>
                  <div className="grid gvid-cols-1 gap-3">
                    {result.precautions.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-muted/20 rounded-2xl border border-border/50 group hover:border-primary/20 transition-all shadow-sm">
                        <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-black shrink-0 group-hover:rotate-12 transition-transform">
                          {i + 1}
                        </div>
                        <span className="text-sm font-bold uppercase text-muted-foreground group-hover:text-foregroun transition-colors">{p}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-dashed">
                  <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 text-center">Diagnostic Evidence</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {result.detected_symptoms.map((s) => (
                      <Badge key={s} variant="outline" className="text-[11px] font-bold py-1 px-3 rounded-lg border-primary/20 bg-primary/5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t flex flex-col gap-4 p-8">
                <Button variant="outline" className="w-full h-12 font-bold rounded-xl border-primary/20 hover:bg-primary/5" onClick={() => window.print()}>
                  Generate PDF Report
                </Button>
                <p className="text-[10px] text-center text-muted-foreground/60 leading-tight">
                  This report is generated by an automated clinical reasoning engine. It is not a final medical diagnosis. Always consult with a licensed professional.
                </p>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
