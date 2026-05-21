'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Calendar, FlaskConical, MapPin, Search, Star, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProviderService, ProviderServiceCategory } from '@/types/api';
import { serviceProvidersApi } from '../api';
import { ReviewSection } from '@/features/reviews/components/ReviewSection';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { createConversation } from '@/features/chat/api';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categories: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Categories' },
  { value: 'lab_test', label: 'Lab tests' },
  { value: 'imaging', label: 'Imaging' },
  { value: 'health_package', label: 'Packages' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' },
];

export function PatientServiceMarketplace() {
  const router = useRouter();
  const [services, setServices] = useState<ProviderService[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();

  // Booking Form State
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState<number | null>(null);

  const loadServices = async (userLoc?: { lat: number; lng: number }) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await serviceProvidersApi.listServices({
        search: search || undefined,
        category: category === 'all' ? undefined : (category as ProviderServiceCategory),
        user_lat: userLoc?.lat || location?.lat,
        user_lng: userLoc?.lng || location?.lng,
      });
      setServices(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not load service offers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Attempt to get user location for proximity sorting
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(loc);
          loadServices(loc);
        },
        () => {
          // Fallback if location denied or failed
          loadServices();
        }
      );
    } else {
      loadServices();
    }
  }, []);

  const handleBooking = async (serviceId: number) => {
    if (!bookingDate) {
      toast({ title: 'Error', description: 'Please select a date for the service.', variant: 'destructive' });
      return;
    }

    // Block if selected date/time has already passed
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (bookingDate < today) {
      toast({ title: 'Expired', description: 'Please try again with the next day.', variant: 'destructive' });
      return;
    }
    if (bookingDate === today && bookingTime) {
      const [h, m] = bookingTime.split(':').map(Number);
      if (h * 60 + m <= now.getHours() * 60 + now.getMinutes()) {
        toast({ title: 'Expired', description: 'Please try again with the next day.', variant: 'destructive' });
        return;
      }
    }

    try {
      setIsBooking(true);
      await serviceProvidersApi.createBooking({
        service: serviceId,
        date: bookingDate,
        preferred_time: bookingTime || undefined,
        notes: bookingNotes,
      });
      toast({ title: 'Success', description: 'Your booking request has been submitted.' });
      setIsDialogOpen(null);
      setBookingDate('');
      setBookingTime('');
      setBookingNotes('');
    } catch (err: any) {
      toast({ 
        title: 'Booking Failed', 
        description: err?.response?.data?.error || 'Could not process booking.', 
        variant: 'destructive' 
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleMessageProvider = async (userId: number) => {
    try {
      const response = await createConversation(userId);
      const conversationId = response.id;
      router.push(`/messages?id=${conversationId}`);
    } catch (error) {
      console.error('Failed to initiate conversation:', error);
    }
  };

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

      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search CBC, X-ray, health package..."
            className="pl-9 h-10"
          />
        </div>
        <div className="w-full md:w-72">
          <LocationPicker 
            placeholder="Location (optional)" 
            onLocationSelect={(loc) => {
              if (loc) {
                const newLoc = { lat: loc.latitude, lng: loc.longitude };
                setLocation(newLoc);
                loadServices(newLoc);
              } else {
                setLocation(null);
                loadServices();
              }
            }}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          type="button" 
          onClick={() => loadServices()}
          className="h-10 px-6"
        >
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
                
                <div className="flex justify-end pt-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => service.organization_user_id && handleMessageProvider(service.organization_user_id)}
                    title="Message Hospital"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>

                  <Dialog open={isDialogOpen === service.id} onOpenChange={(open) => setIsDialogOpen(open ? service.id : null)}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="w-full sm:w-auto">
                        <Calendar className="mr-2 h-4 w-4" />
                        Book Service
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Book {service.name}</DialogTitle>
                        <DialogDescription>
                          Request a booking for this service at {service.organization_name}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Preferred Date</label>
                          <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Preferred Time (Optional)</label>
                          <Input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Notes for the hospital</label>
                          <Textarea 
                            placeholder="Symptoms, special requests, etc." 
                            value={bookingNotes} 
                            onChange={(e) => setBookingNotes(e.target.value)} 
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(null)}>Cancel</Button>
                        <Button onClick={() => handleBooking(service.id)} disabled={isBooking}>
                          {isBooking ? 'Processing...' : 'Confirm Booking'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
