import { api } from '@/lib/api/axios';
import type { 
  ProviderService, 
  ProviderServiceCategory, 
  ServiceProviderOrganization,
  ServiceAvailability,
  ServiceBooking
} from '@/types/api';

export interface ProviderServiceInput {
  name: string;
  category: ProviderServiceCategory;
  description?: string;
  price: string;
  discounted_price?: string | null;
  turnaround_time?: string;
  sample_required?: string;
  is_available: boolean;
}

export const serviceProvidersApi = {
  listServices: async (params?: {
    search?: string;
    category?: ProviderServiceCategory | '';
    district?: string;
    max_price?: string;
    mine?: boolean;
    competitors?: boolean;
    approval_status?: 'pending' | 'approved' | 'rejected';
    user_lat?: number;
    user_lng?: number;
  }): Promise<ProviderService[]> => {
    const data = await api.get<any>(
      '/api/service-providers/services/',
      { params: { 
        ...params, 
        mine: params?.mine ? 'true' : undefined, 
        competitors: params?.competitors ? 'true' : undefined,
        approval_status: params?.approval_status
      } }
    );
    // Robustly handle DRF pagination object vs raw array
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  },

  createService: async (data: ProviderServiceInput): Promise<ProviderService> => {
    return api.post('/api/service-providers/services/', data);
  },

  updateService: async (id: number, data: Partial<ProviderServiceInput>): Promise<ProviderService> => {
    return api.patch(`/api/service-providers/services/${id}/`, data);
  },

  deleteService: async (id: number): Promise<void> => {
    return api.delete(`/api/service-providers/services/${id}/`);
  },

  listAvailability: async (): Promise<ServiceAvailability[]> => {
    const response = await api.get<ServiceAvailability[] | { results: ServiceAvailability[] }>('/api/service-providers/availability/');
    return Array.isArray(response) ? response : (response as any).results || [];
  },

  createAvailability: async (data: Partial<ServiceAvailability>): Promise<ServiceAvailability> => {
    return api.post('/api/service-providers/availability/', data);
  },

  deleteAvailability: async (id: number): Promise<void> => {
    return api.delete(`/api/service-providers/availability/${id}/`);
  },

  listBookings: async (): Promise<ServiceBooking[]> => {
    const response = await api.get<ServiceBooking[] | { results: ServiceBooking[] }>('/api/service-providers/bookings/');
    return Array.isArray(response) ? response : (response as any).results || [];
  },

  updateBookingStatus: async (id: number, status: ServiceBooking['status']): Promise<ServiceBooking> => {
    return api.patch(`/api/service-providers/bookings/${id}/`, { status });
  },

  createBooking: async (data: { 
    service: number; 
    date: string; 
    preferred_time?: string; 
    notes?: string; 
  }): Promise<ServiceBooking> => {
    return api.post('/api/service-providers/bookings/', data);
  },

  getMyOrganization: async (): Promise<ServiceProviderOrganization> => {
    return api.get('/api/service-providers/organizations/me/');
  },

  updateMyOrganization: async (data: Partial<ServiceProviderOrganization>): Promise<ServiceProviderOrganization> => {
    return api.patch('/api/service-providers/organizations/me/', data);
  },
};
