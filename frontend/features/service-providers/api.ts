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

export const serviceProvidersApi = {
  listServices: async (params?: {
    search?: string;
    category?: ProviderServiceCategory | '';
    district?: string;
    max_price?: string;
  }): Promise<ProviderService[]> => {
    const response = await api.get<ProviderService[] | { results: ProviderService[] }>(
      '/api/service-providers/services/',
      { params }
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
};
