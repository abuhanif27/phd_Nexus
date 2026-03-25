'use client';

import { useMemo, useState } from 'react';
import {
  ClipboardList,
  FileClock,
  Grip,
  Link2,
  Plus,
  Sparkles,
  Trash2,
  UserSearch,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { getDoctorSummaryFromState, usePortalStore } from '@/store/usePortalStore';
import type { PrescriptionCategory, PrescriptionTemplate } from '@/types/portal';

const categories: PrescriptionCategory[] = ['condition', 'advice', 'test', 'medicine'];

export function DoctorWorkspace() {
  const activeProfileId = usePortalStore((state) => state.activeProfileId);
  const profiles = usePortalStore((state) => state.profiles);
  const doctorWorkspaces = usePortalStore((state) => state.doctorWorkspaces);
  const patientWorkspaces = usePortalStore((state) => state.patientWorkspaces);
  const resolveVisitCodeForDoctor = usePortalStore((state) => state.resolveVisitCodeForDoctor);
  const addDraftTemplate = usePortalStore((state) => state.addDraftTemplate);
  const removeDraftTemplate = usePortalStore((state) => state.removeDraftTemplate);
  const clearDoctorDraft = usePortalStore((state) => state.clearDoctorDraft);
  const [visitCodeInput, setVisitCodeInput] = useState('');

  const profile = useMemo(
    () => profiles.find((item) => item.id === activeProfileId && item.role === 'doctor') ?? null,
    [activeProfileId, profiles]
  );
  const workspace = profile ? doctorWorkspaces[profile.id] : undefined;
  const linkedPatient = workspace?.linkedPatientProfileId
    ? profiles.find((item) => item.id === workspace.linkedPatientProfileId) ?? null
    : null;
  const linkedPatientWorkspace = linkedPatient ? patientWorkspaces[linkedPatient.id] : undefined;
  const aiSummary = getDoctorSummaryFromState(linkedPatient ?? undefined, linkedPatientWorkspace);

  if (!profile || !workspace) {
    return null;
  }

  const handleResolve = () => {
    const result = resolveVisitCodeForDoctor(profile.id, visitCodeInput);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Code not found',
        description: 'Use a valid patient visit code generated from the patient page.',
      });
      return;
    }

    toast({
      title: 'Patient linked',
      description: 'AI overview and full history are now visible on the doctor page.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Doctor intelligent workspace</h1>
          <p className="text-muted-foreground">
            Patient code lookup, AI summary, linked history, and fast prescription drafting.
          </p>
        </div>
        <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
          {profile.specialty || 'Specialist'} mode
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserSearch className="h-5 w-5 text-blue-600" /> Patient visit code access
              </CardTitle>
              <CardDescription>
                Enter the code from the patient page to load overview and linked history.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row">
              <Input
                value={visitCodeInput}
                onChange={(event) => setVisitCodeInput(event.target.value.toUpperCase())}
                placeholder="NC-0312-ABCD"
                className="md:flex-1"
              />
              <Button onClick={handleResolve}>
                <Link2 className="mr-2 h-4 w-4" /> Load patient
              </Button>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-violet-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" /> AI patient overview
              </CardTitle>
              <CardDescription>
                This page is auto-generated from the patient history when a valid code is entered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedPatient && linkedPatientWorkspace ? (
                <>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="font-semibold">{linkedPatient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {workspace.resolvedVisitCode} • {linkedPatient.phone || 'No phone stored'}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {aiSummary.map((line) => (
                      <div key={line} className="rounded-2xl border bg-white/80 p-4 text-sm text-slate-700">
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <FileClock className="h-4 w-4" /> Linked patient history
                    </div>
                    {linkedPatientWorkspace.records.map((record) => (
                      <div key={record.id} className="rounded-2xl border bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{record.title}</p>
                            <p className="text-sm text-muted-foreground">{record.department}</p>
                          </div>
                          <Badge variant="outline">{record.date}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{record.summary}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed bg-white/70 p-6 text-sm text-muted-foreground">
                  Prescription is visible by default. Load a patient code to attach history and an AI summary.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-600" /> Drag-drop prescription builder
              </CardTitle>
              <CardDescription>
                Prepared by doctor or assistant. Add items with click or drag into any section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {categories.map((category) => (
                <div key={category} className="space-y-3 rounded-2xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold capitalize">{category}</p>
                      <p className="text-xs text-muted-foreground">Prepared quick-add items</p>
                    </div>
                    <Badge variant="outline">{workspace.templates[category].length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {workspace.templates[category].map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData('application/json', JSON.stringify(template));
                        }}
                        onClick={() => addDraftTemplate(profile.id, category, template)}
                        className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-2 text-xs transition hover:border-emerald-300 hover:bg-emerald-50"
                      >
                        <Grip className="h-3.5 w-3.5" /> {template.label} <Plus className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
            <CardHeader>
              <CardTitle>Prescription drop board</CardTitle>
              <CardDescription>
                Drop items into the 4 required sections: রোগের ধরন, ডাক্তারের পরামর্শ, পরীক্ষা, ঔষধ.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((category) => (
                <DropZone
                  key={category}
                  category={category}
                  items={workspace.draft[category]}
                  onDropItem={(template) => addDraftTemplate(profile.id, category, template)}
                  onRemove={(templateId) => removeDraftTemplate(profile.id, category, templateId)}
                />
              ))}
              <Button variant="outline" className="w-full" onClick={() => clearDoctorDraft(profile.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear draft
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DropZone({
  category,
  items,
  onDropItem,
  onRemove,
}: {
  category: PrescriptionCategory;
  items: PrescriptionTemplate[];
  onDropItem: (template: PrescriptionTemplate) => void;
  onRemove: (templateId: string) => void;
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const payload = event.dataTransfer.getData('application/json');
        if (!payload) {
          return;
        }
        onDropItem(JSON.parse(payload) as PrescriptionTemplate);
      }}
      className="rounded-2xl border border-dashed border-emerald-300 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold capitalize">{category}</p>
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Drop a prepared item here.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-slate-50 p-3">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.detail}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
