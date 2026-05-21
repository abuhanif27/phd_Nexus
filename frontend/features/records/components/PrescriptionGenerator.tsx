'use client';

import { useState } from 'react';
import { 
  Plus, 
  Trash, 
  Pill, 
  Send, 
  FileText, 
  User, 
  Calendar, 
  Clock,
  Stethoscope,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createPrescription } from '@/features/records/api';
import { useToast } from '@/components/ui/use-toast';
import type { PrescriptionItem } from '@/features/records/types';
import { format, addMonths } from 'date-fns';
import { useCurrentUser } from '@/features/auth/hooks';

interface PrescriptionGeneratorProps {
  patientId: number;
  patientName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PrescriptionGenerator({
  patientId,
  patientName,
  onSuccess,
  onCancel,
}: PrescriptionGeneratorProps) {
  const { data: user } = useCurrentUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [items, setItems] = useState<PrescriptionItem[]>([
    { drug: '', dosage: '', duration: '', instructions: '' }
  ]);
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));

  const addItem = () => {
    setItems([...items, { drug: '', dosage: '', duration: '', instructions: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validItems = items.filter(item => item.drug.trim() !== '');
    if (validItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please add at least one medication.'
      });
      return;
    }

    setLoading(true);
    try {
      await createPrescription({
        patient: patientId,
        items: validItems,
        notes,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      toast({
        title: 'Prescription Created',
        description: `Prescription successfully assigned to ${patientName}.`
      });
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err?.response?.data?.error || 'Failed to create prescription.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <Card className="border-2 shadow-lg overflow-hidden bg-slate-50">
        {/* Prescription Header - "The Beautiful Part" */}
        <div className="bg-white border-b-4 border-primary/20 p-8 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Stethoscope className="w-8 h-8" />
              NexusCare Medical
            </h1>
            <p className="text-muted-foreground font-medium">Digital Prescription Service</p>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">Dr. {user?.doctor_profile?.name || user?.email}</div>
            <div className="text-sm text-muted-foreground">{user?.doctor_profile?.specialty}</div>
            <div className="text-xs text-muted-foreground mt-1">{format(new Date(), 'PPP')}</div>
          </div>
        </div>

        <CardContent className="p-8 space-y-8 bg-white/50">
          {/* Patient Info Section */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <div className="bg-blue-600 p-3 rounded-full text-white">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Patient</p>
              <h3 className="text-xl font-bold text-slate-900">{patientName}</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  <Pill className="w-5 h-5 text-blue-600" />
                  Rx - Medications
                </h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addItem}
                  className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Medication
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div 
                    key={index} 
                    className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all"
                  >
                    <div className="md:col-span-4 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Drug Name</Label>
                      <Input 
                        placeholder="e.g. Amoxicillin 500mg" 
                        value={item.drug}
                        onChange={(e) => updateItem(index, 'drug', e.target.value)}
                        className="bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
                        required
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Dosage</Label>
                      <Input 
                        placeholder="1-0-1" 
                        value={item.dosage}
                        onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                        className="bg-slate-50/50 border-slate-200 focus:bg-white"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Duration</Label>
                      <Input 
                        placeholder="7 days" 
                        value={item.duration}
                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                        className="bg-slate-50/50 border-slate-200 focus:bg-white"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-500 uppercase">Instructions</Label>
                      <Input 
                        placeholder="After food" 
                        value={item.instructions}
                        onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                        className="bg-slate-50/50 border-slate-200 focus:bg-white"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end pb-0.5">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Additional Notes
                </Label>
                <Textarea 
                  placeholder="Additional advice or instructions for the patient..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[120px] bg-slate-50/50 border-slate-200 focus:bg-white resize-none"
                />
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Valid Until
                  </Label>
                  <Input 
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 focus:bg-white"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Default: 1 month from today
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-orange-50 border border-orange-100 space-y-2">
                  <h4 className="text-xs font-bold text-orange-800 uppercase flex items-center gap-2">
                    <ShieldAlert className="w-3 h-3" />
                    Medical Notice
                  </h4>
                  <p className="text-[10px] text-orange-700 leading-relaxed">
                    This is a digitally generated prescription. By submitting, you confirm the medical necessity and correctness of the prescribed medications for the identified patient.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading}
                  className="border-slate-300"
                >
                  Discard
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                className="px-8 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Issue Prescription
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
