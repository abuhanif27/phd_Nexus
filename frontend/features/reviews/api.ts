import { apiClient } from '@/lib/api/axios';

export interface Review {
  id: number;
  user: number;
  user_email: string;
  doctor?: number;
  organization?: number;
  rating: number;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewInput {
  doctor?: number;
  organization?: number;
  rating: number;
  comment: string;
}

export const reviewsApi = {
  listReviews: async (params: { doctor_id?: number; organization_id?: number }) => {
    const response = await apiClient.get<Review[] | { results: Review[] }>('/api/reviews/', { params });
    // Handle both raw array and paginated results
    return Array.isArray(response.data) ? response.data : response.data.results;
  },
  createReview: async (data: CreateReviewInput) => {
    const response = await apiClient.post<Review>('/api/reviews/', data);
    return response.data;
  },
};
