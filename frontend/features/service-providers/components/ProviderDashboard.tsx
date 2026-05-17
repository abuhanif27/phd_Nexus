'use client';

import { useEffect, useState } from 'react';
import { Building2, Plus, Save, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ProviderService, ProviderServiceCategory, ServiceProviderOrganization } from '@/types/api';
import { serviceProvidersApi, type ProviderServiceInput } from '../api';

const emptyForm: ProviderServiceInput = {
  name: '',
  category: 'lab_test',
  description: '',
  price: '',
  discounted_price: '',
  turnaround_time: '',
  sample_required: '',
  is_available: true,
};

export function ProviderDashboard() {
  const [organization, setOrganization] = useState<ServiceProviderOrganization | null>(null);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [form, setForm] = useState<ProviderServiceInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [org, serviceRows] = await Promise.all([
        serviceProvidersApi.getMyOrganization(),
        serviceProvidersApi.listServices(),
      ]);
      setOrganization(org);
      setServices(serviceRows);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load provider dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveService = async () => {
    try {
      setError(null);
      setMessage(null);
      const payload = {
        ...form,
        discounted_price: form.discounted_price || null,
      };
      if (editingId) {
        await serviceProvidersApi.updateService(editingId, payload);
        setMessage('Service updated.');
      } else {
        await serviceProvidersApi.createService(payload);
        setMessage('Service created.');
      }
      resetForm();
      await loadDashboard();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save service.');
    }
  };

  const editService = (service: ProviderService) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      category: service.category,
      description: service.description,
      price: service.price,
      discounted_price: service.discounted_price || '',
      turnaround_time: service.turnaround_time,
      sample_required: service.sample_required,
      is_available: service.is_available,
    });
  };

  const deleteService = async (id: number) => {
    await serviceProvidersApi.deleteService(id);
    await loadDashboard();
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading provider workspace...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Provider Dashboard</h1>
          <p className="text-muted-foreground">
            Manage lab tests, imaging, packages, and Bangladesh price offers visible to patients.
          </p>
        </div>
        {organization && (
          <Badge className="w-fit bg-slate-900 text-white hover:bg-slate-900">
            {organization.organization_name}
          </Badge>
        )}
      </div>

      {organization && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-white">
              {organization.logo ? (
                <img src={organization.logo} alt="" className="h-14 w-14 object-contain" />
              ) : (
                <Building2 className="h-7 w-7 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold">{organization.organization_name}</h2>
              <p className="text-sm text-muted-foreground">
                {organization.address}, {organization.district}
              </p>
            </div>
            <Badge variant={organization.verification_status === 'approved' ? 'default' : 'outline'}>
              {organization.verification_status}
            </Badge>
          </CardContent>
        </Card>
      )}

      {message && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit service' : 'Add service offer'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="CBC, X-ray chest, Executive health package"
            />
            <select
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value as ProviderServiceCategory }))
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="lab_test">Lab Test</option>
              <option value="imaging">Imaging</option>
              <option value="health_package">Health Package</option>
              <option value="consultation">Consultation</option>
              <option value="procedure">Procedure</option>
              <option value="other">Other</option>
            </select>
            <Input
              type="number"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="Regular price in BDT"
            />
            <Input
              type="number"
              value={form.discounted_price || ''}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discounted_price: event.target.value }))
              }
              placeholder="Offer price in BDT"
            />
            <Input
              value={form.turnaround_time}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, turnaround_time: event.target.value }))
              }
              placeholder="Same day, 24 hours"
            />
            <Input
              value={form.sample_required}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sample_required: event.target.value }))
              }
              placeholder="Blood, urine, fasting required"
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Short service details for patients"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_available}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, is_available: event.target.checked }))
                }
              />
              Available to patients
            </label>
            <div className="flex gap-2">
              <Button type="button" onClick={saveService} disabled={!form.name || !form.price}>
                {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingId ? 'Save' : 'Add'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current service offers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{service.name}</h3>
                    {!service.is_available && <Badge variant="outline">hidden</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    ৳ {Number(service.discounted_price || service.price).toLocaleString()}
                    {service.discounted_price ? ` offer, regular ৳ ${Number(service.price).toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => editService(service)}>
                    Edit
                  </Button>
                  <Button type="button" variant="outline" onClick={() => deleteService(service.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm text-muted-foreground">No service offers have been added yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
