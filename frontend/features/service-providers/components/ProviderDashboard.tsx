'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Save, Search, Trash2, Users, Settings, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils/cn';
import type { ProviderService, ProviderServiceCategory, ServiceProviderOrganization } from '@/types/api';
import { serviceProvidersApi, type ProviderServiceInput } from '../api';
import { useAuthStore } from '@/features/auth/store';

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
  const [orgForm, setOrgForm] = useState<Partial<ServiceProviderOrganization>>({});
  const [services, setServices] = useState<ProviderService[]>([]);
  const [competitors, setCompetitors] = useState<ProviderService[]>([]);
  const [compSearch, setCompSearch] = useState('');
  const [form, setForm] = useState<ProviderServiceInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompLoading, setIsCompLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const activeServices = useMemo(() => services.filter(s => s.approval_status === 'approved'), [services]);
  const pendingServices = useMemo(() => services.filter(s => s.approval_status === 'pending'), [services]);
  const rejectedServices = useMemo(() => services.filter(s => s.approval_status === 'rejected'), [services]);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [org, serviceRows] = await Promise.all([
        serviceProvidersApi.getMyOrganization(),
        serviceProvidersApi.listServices({ mine: true }),
      ]);
      setOrganization(org);
      setOrgForm(org);
      setServices(serviceRows);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load provider dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      const { user: authUser, updateUser } = useAuthStore.getState();
      setError(null);
      setMessage(null);
      const updated = await serviceProvidersApi.updateMyOrganization(orgForm);
      setOrganization(updated);
      if (authUser) {
        updateUser({ ...authUser, provider_profile: updated });
      }
      setMessage('Profile updated successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not update profile.');
    }
  };

  const loadCompetitors = async () => {
    try {
      setIsCompLoading(true);
      const data = await serviceProvidersApi.listServices({
        competitors: true,
        search: compSearch || undefined,
      });
      setCompetitors(data);
    } catch (err) {
      console.error('Failed to load competitors', err);
    } finally {
      setIsCompLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (organization) loadCompetitors();
    }, 500);
    return () => clearTimeout(timer);
  }, [compSearch, organization]);

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Workspace</h1>
          <p className="text-muted-foreground">
            {organization?.organization_name || 'Medical'} dashboard for service management and market intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadDashboard} disabled={isLoading}>
            <Clock className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {organization && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border">
              <Building2 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold">{organization.organization_name}</span>
            </div>
          )}
          <Button onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); setForm(emptyForm); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Service
          </Button>
        </div>
      </div>

      {message && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit medical service' : 'Submit new service for approval'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Name</label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="e.g., MRI Brain with Contrast"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Regular Price (BDT)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Offer Price (Optional)</label>
              <Input
                type="number"
                value={form.discounted_price || ''}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discounted_price: event.target.value }))
                }
                placeholder="800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Turnaround Time</label>
              <Input
                value={form.turnaround_time}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, turnaround_time: event.target.value }))
                }
                placeholder="24-48 hours"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sample/Preparation</label>
              <Input
                value={form.sample_required}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sample_required: event.target.value }))
                }
                placeholder="Fasting required, Blood"
              />
            </div>
            <div className="col-span-full space-y-2">
              <label className="text-sm font-medium">Clinical Description</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Brief clinical indications or details..."
              />
            </div>
            <div className="col-span-full flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_available: event.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                Active & visible once approved
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setShowAddForm(false); setEditingId(null); }}>
                  Cancel
                </Button>
                <Button onClick={saveService} disabled={!form.name || !form.price}>
                  {editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingId ? 'Update Service' : 'Submit for Approval'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="services" className="px-6">Medical Services</TabsTrigger>
          <TabsTrigger value="competitors" className="px-6">Market Intelligence</TabsTrigger>
          <TabsTrigger value="profile" className="px-6">Hospital Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-green-50/50 border-green-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Live Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{activeServices.length}</div>
                <p className="text-xs text-green-600/80">Approved & visible to patients</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 border-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
                  <Clock className="h-4 w-4" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-700">{pendingServices.length}</div>
                <p className="text-xs text-amber-600/80">Awaiting admin verification</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  Rejected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{rejectedServices.length}</div>
                <p className="text-xs text-red-600/80">Requires correction</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                Service Catalog
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {services.length > 0 ? (
                  services.map((service) => (
                    <div key={service.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{service.name}</span>
                          <Badge variant={
                            service.approval_status === 'approved' ? 'default' : 
                            service.approval_status === 'pending' ? 'outline' : 'destructive'
                          } className="text-[10px] uppercase px-1.5 py-0">
                            {service.approval_status}
                          </Badge>
                          {!service.is_available && <Badge variant="secondary" className="text-[10px]">HIDDEN</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="font-medium text-slate-700">৳ {Number(service.price).toLocaleString()}</span>
                          {service.discounted_price && (
                            <span className="text-blue-600 font-medium">Offer: ৳ {Number(service.discounted_price).toLocaleString()}</span>
                          )}
                          <span>• {service.category.replace('_', ' ')}</span>
                          <span>• {service.turnaround_time || 'No TAT'}</span>
                        </div>
                        {service.admin_feedback && service.approval_status === 'rejected' && (
                          <p className="text-xs text-red-600 bg-red-50 p-1.5 rounded mt-2 border border-red-100">
                            <strong>Note:</strong> {service.admin_feedback}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3 md:mt-0">
                        <Button size="sm" variant="outline" onClick={() => {
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
                          setShowAddForm(true);
                        }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteService(service.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Building2 className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500">Your service catalog is empty.</p>
                    <Button variant="link" onClick={() => setShowAddForm(true)}>Add your first medical service</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Market Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                See what other diagnostic centers and hospitals in the region are offering.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search competitor services (e.g. CBC, MRI)..."
                  value={compSearch}
                  onChange={(e) => setCompSearch(e.target.value)}
                />
              </div>

              {isCompLoading ? (
                <p className="text-sm text-muted-foreground">Loading market data...</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {competitors.map((comp) => (
                    <div key={comp.id} className="rounded-lg border p-4 space-y-2 bg-slate-50/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{comp.name}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {comp.organization_name} ({comp.district})
                          </p>
                        </div>
                        <Badge variant="secondary" className="bg-white">
                          ৳ {Number(comp.discounted_price || comp.price).toLocaleString()}
                        </Badge>
                      </div>
                      {comp.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          "{comp.description}"
                        </p>
                      )}
                      <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t">
                        <span>Time: {comp.turnaround_time || 'N/A'}</span>
                        <span>Sample: {comp.sample_required || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                  {competitors.length === 0 && (
                    <p className="col-span-full text-center py-10 text-sm text-muted-foreground border-2 border-dashed rounded-xl">
                      No competitor services found matching your search.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your organization details visible to patients.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Name</label>
                  <Input
                    value={orgForm.organization_name || ''}
                    onChange={(e) => setOrgForm({ ...orgForm, organization_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Person</label>
                  <Input
                    value={orgForm.contact_person || ''}
                    onChange={(e) => setOrgForm({ ...orgForm, contact_person: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={orgForm.phone || ''}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">District</label>
                  <Input
                    value={orgForm.district || ''}
                    onChange={(e) => setOrgForm({ ...orgForm, district: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                    value={orgForm.address || ''}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={4}
                    value={orgForm.description || ''}
                    onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })}
                    placeholder="Tell patients about your facilities and expertise..."
                  />
                </div>
              </div>
              <Button onClick={saveProfile}>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
