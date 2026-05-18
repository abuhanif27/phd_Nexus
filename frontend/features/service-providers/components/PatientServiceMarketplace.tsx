'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, FlaskConical, MapPin, Search, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ProviderService, ProviderServiceCategory } from '@/types/api';
import { serviceProvidersApi } from '../api';
import { ReviewSection } from '@/features/reviews/components/ReviewSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const categories: Array<{ value: ProviderServiceCategory | ''; label: string }> = [
  { value: '', label: 'All categories' },
  { value: 'lab_test', label: 'Lab tests' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'health_package', label: 'Packages' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' },
];

export function PatientServiceMarketplace() {
  const [services, setServices] = useState<ProviderService[]>([]);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [category, setCategory] = useState<ProviderServiceCategory | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await serviceProvidersApi.listServices({
        search: search || undefined,
        district: district || undefined,
        category: category || undefined,
      });
      setServices(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load service offers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const resultCount = useMemo(() => services.length, [services]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Service Offers</h1>
          <p className="text-muted-foreground">
            Compare approved Bangladeshi hospital, diagnostic, lab, and imaging prices.
          </p>
        </div>
        <Badge className="w-fit bg-slate-900 text-white hover:bg-slate-900">
          {resultCount} live offers
        </Badge>
      </div>

      <div className="grid gap-3 rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search CBC, X-ray, health package..."
            className="pl-9"
          />
        </div>
        <Input
          value={district}
          onChange={(event) => setDistrict(event.target.value)}
          placeholder="District"
        />
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as ProviderServiceCategory | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {categories.map((item) => (
            <option key={item.value || 'all'} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <Button type="button" onClick={loadServices}>
          Search
        </Button>
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {isLoading ? (
        <p className="text-muted-foreground">Loading service offers...</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{service.organization_name}</span>
                      <MapPin className="ml-2 h-4 w-4" />
                      <span>{service.district}</span>
                    </div>
                    {/* Organization Rating */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <span className="text-xs font-bold">{(service as any).organization_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="text-xs text-blue-600 hover:underline">View Reviews</button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Reviews for {service.organization_name}</DialogTitle>
                          </DialogHeader>
                          <ReviewSection organizationId={service.organization} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <Badge variant="outline">{categories.find((item) => item.value === service.category)?.label}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl font-bold text-blue-700">
                    ৳ {Number(service.discounted_price || service.price).toLocaleString()}
                  </span>
                  {service.discounted_price && (
                    <span className="text-sm text-muted-foreground line-through">
                      ৳ {Number(service.price).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4" />
                    <span>{service.sample_required || 'Sample info not specified'}</span>
                  </div>
                  <div>{service.turnaround_time || 'Turnaround time not specified'}</div>
                </div>
                
                <div className="flex justify-end pt-2">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Details & Booking
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {services.length === 0 && (
            <p className="rounded-lg border bg-white p-6 text-muted-foreground dark:bg-slate-900">
              No approved service offers matched your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
