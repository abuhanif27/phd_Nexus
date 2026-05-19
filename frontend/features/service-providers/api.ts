import { api } from '@/lib/api/axios';
import type { ProviderService, ProviderServiceCategory, ServiceProviderOrganization } from '@/types/api';

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

export interface ProviderService {
  id: number;
  organization: number;
  organization_name: string;
  organization_rating: number;
  district: string;
  logo: string | null;
  name: string;
  category: ProviderServiceCategory;
  description: string;
  price: string;
  discounted_price: string | null;
  turnaround_time: string;
  sample_required: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  admin_feedback?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
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
  }): Promise<ProviderService[]> => {
    const response = await api.get<ProviderService[] | { results: ProviderService[] }>(
      '/api/service-providers/services/',
      { params: { 
        ...params, 
        mine: params?.mine ? 'true' : undefined, 
        competitors: params?.competitors ? 'true' : undefined,
        approval_status: params?.approval_status
      } }
    );
    return Array.isArray(response) ? response : response.results;
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

  getMyOrganization: async (): Promise<ServiceProviderOrganization> => {
    return api.get('/api/service-providers/organizations/me/');
  },

  updateMyOrganization: async (data: Partial<ServiceProviderOrganization>): Promise<ServiceProviderOrganization> => {
    return api.patch('/api/service-providers/organizations/me/', data);
  },
};
