"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Info,
  Loader2,
  MapPin,
  Search,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { checkSymptoms, getSymptomList } from "../api";

export function SymptomChecker() {
  const [searchTerm, setSearchTerm] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<number[]>([]);
  const [selecteeSymptoms, setSelecteeSymptoms] = useState<string[]>([]);

  const { data: symptomData } = useQuery({
    queryKey: ["symptoms-list"],
    queryFn: getSymptomList,
  });

  const analyzeMutation = useMutation({
    mutationFn: checkSymptoms,
  });

  const filteredSymptoms =
    symptomData?.symptoms
      .map((name, index) => ({ name, index }))
      .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 12) || [];

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
    if (selecteeSymptoms.length === 0 && !description.trim()) return;
    analyzeMutation.mutate({
      text: description,
      manual_symptoms: selecteeSymptoms,
    });
  };

  const isLoading = analyzeMutation.isPending;
  const result = analyzeMutation.data as any | undefined;
  const confidencePercent = result ? Math.round((Number(result.confidence) || 0) * 100) : 0;
  const severityScore = result ? Number(result.severity_score || 0) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Symptom Checker</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Describe your symptoms or select from the list to get a specialist recommendation based on your dataset.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <Card className="overflow-hidden shadow-md border-0 ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b">
              <CardTitle className="text-lg">Symptoms</CardTitle>
              <CardDescription>Use a short description or select symptoms below.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <Textarea
                placeholder="e.g., chest pain and shortness of breath for 2 days"
                className="min-h-[120px] rounded-xl border-primary/20 focus-visible:ring-primary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="Search symptoms..."
                    className="pl-10 h-11 rounded-xl border-primary/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
                {searchTerm && (
                  <div className="rounded-xl border bg-background shadow-lg">
                    <ScrollArea className="max-h-56">
                      {filteredSymptoms.length > 0 ? (
                        filteredSymptoms.map((s) => (
                          <button
                            key={s.index}
                            type="button"
                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => handleAddSymptom(s.index)}
                          >
                            {s.name}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No matches found</div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selecteeSymptoms.length > 0 ? (
                  selecteeSymptoms.map((raw) => (
                    <Badge key={raw} variant="secondary" className="gap-2 text-sm">
                      {raw.replace(/_/g, " ")}
                      <X className="h-3.5 w-3.5 cursor-pointer" onClick={() => handleRemoveSymptom(raw)} />
                    </Badge>
                  ))
                ) : (
                  <div className="w-full py-4 text-center border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                    No symptoms selected yet.
                  </div>
                )}
              </div>

              <Button
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                onClick={handleAnalyze}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Generate Recommendation"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card className="h-full shadow-md border-0 ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader className="bg-gray-50/50 dark:bg-gray-900/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {!result && !isLoading && (
                <div className="h-full min-h-[420px] flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-dashed">
                  <User className="h-10 w-10 text-blue-600/20" />
                  <h3 className="text-lg font-semibold mt-3">Awaiting symptoms</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Enter symptoms to see a specialist recommendation and available doctors.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  <p className="text-sm text-muted-foreground">Running clinical matching...</p>
                </div>
              )}

              {result && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded-xl border bg-white dark:bg-gray-950 shadow-sm">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Condition</p>
                      <p className="text-lg font-bold mt-1">{result.disease}</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-white dark:bg-gray-950 shadow-sm">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Confidence</p>
                      <p className="text-lg font-bold mt-1">{confidencePercent}%</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-white dark:bg-gray-950 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Suggested Specialist</p>
                        <p className="text-lg font-bold">{result.specialist}</p>
                      </div>
                      {result.specialist_available ? (
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <BadgeCheck className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Not available
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Severity</span>
                        <span>{severityScore.toFixed(1)} / 7</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${
                            severityScore >= 5
                              ? "bg-destructive"
                              : severityScore >= 3
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, (severityScore / 7) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-white dark:bg-gray-950 shadow-sm">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Description</p>
                    <p className="text-sm text-muted-foreground mt-2">{result.description}</p>
                  </div>

                  {result.alternatives && result.alternatives.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Alternative Matches</p>
                      <div className="grid gap-2">
                        {result.alternatives.map((alt: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-gray-950 text-sm">
                            <span className="font-semibold">{String(alt.disease ?? "Undetermined")}</span>
                            <Badge variant="secondary">{String(alt.specialist ?? "General Physician")}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Precautions</p>
                    <div className="grid gap-2">
                      {(result.precautions || []).map((precaution: string, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl border bg-white dark:bg-gray-950 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                          <span>{precaution}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Available Doctors</p>
                    <div className="grid gap-4">
                      {result.recommended_doctors && result.recommended_doctors.length > 0 ? (
                        result.recommended_doctors.map((doc: any) => (
                          <div key={doc.id} className="flex items-center gap-4 p-4 rounded-xl border bg-white dark:bg-gray-950">
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold truncate">Dr. {doc.name}</p>
                                {doc.is_verified && <Badge variant="outline">Verified</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{doc.specialty}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                {doc.location || "Location not specified"}
                              </div>
                            </div>
                            <Link href={`/doctors/${doc.id}`}>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Book</Button>
                            </Link>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                          No {result.specialist}s available at the moment.
                          <div className="mt-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/doctors">Browse all doctors</Link>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
