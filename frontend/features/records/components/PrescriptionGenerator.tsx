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
        title: '✅ Prescription Issued',
        description: `Prescription saved to ${patientName}'s records and notification sent.`
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
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4">
      <Card className="border shadow-xl overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 sm:p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-white/20 p-2 rounded-lg">
                <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold">NexusCare Prescription</h1>
                <p className="text-blue-100 text-xs sm:text-sm">Digital Medical Prescription</p>
              </div>
            </div>
            <div className="text-left sm:text-right text-sm">
              <div className="font-semibold">Dr. {user?.doctor_profile?.name || user?.email}</div>
              <div className="text-blue-200 text-xs">{user?.doctor_profile?.specialty}</div>
              <div className="text-blue-200 text-xs mt-0.5">{format(new Date(), 'PPP')}</div>
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 space-y-5 bg-white">
          {/* Patient Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="bg-blue-600 p-2 rounded-full text-white shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-blue-600">Patient</p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{patientName}</h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Medications */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-slate-800">
                  <Pill className="w-4 h-4 text-blue-600" />
                  Medications
                </h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addItem}
                  className="h-8 text-xs bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div 
                    key={index} 
                    className="relative p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3">
                      <div className="col-span-2 sm:col-span-4 space-y-1">
                        <Label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Drug Name</Label>
                        <Input 
                          placeholder="e.g. Amoxicillin 500mg" 
                          value={item.drug}
                          onChange={(e) => updateItem(index, 'drug', e.target.value)}
                          className="h-9 text-sm bg-white"
                          required
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <Label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Dosage</Label>
                        <Input 
                          placeholder="1-0-1" 
                          value={item.dosage}
                          onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div className="col-span-1 sm:col-span-2 space-y-1">
                        <Label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Duration</Label>
                        <Input 
                          placeholder="7 days" 
                          value={item.duration}
                          onChange={(e) => updateItem(index, 'duration', e.target.value)}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-3 space-y-1">
                        <Label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase">Instructions</Label>
                        <Input 
                          placeholder="After food" 
                          value={item.instructions}
                          onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                          className="h-9 text-sm bg-white"
                        />
                      </div>
                      <div className="absolute top-2 right-2 sm:static sm:col-span-1 sm:flex sm:items-end sm:pb-0.5">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Expiry */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Additional Notes
                </Label>
                <Textarea 
                  placeholder="Additional advice or instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] text-sm bg-slate-50 border-slate-200 focus:bg-white resize-none"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Valid Until
                  </Label>
                  <Input 
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white"
                  />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Default: 1 month from today
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <h4 className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-3 h-3" />
                    Medical Notice
                  </h4>
                  <p className="text-[10px] text-amber-700 leading-relaxed mt-1">
                    By submitting, you confirm the medical necessity and correctness of the prescribed medications. This will be saved to the patient&apos;s records automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={loading}
                  className="h-9 text-sm"
                >
                  Discard
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                className="h-9 px-5 text-sm bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-3.5 h-3.5" />
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
