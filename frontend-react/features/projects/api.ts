import { api } from '@/lib/api/axios';
import { Project, ProjectInput, PaginatedProjects, ProjectFilters } from './schemas';

/**
 * Projects API endpoints
 */
export const projectsApi = {
  /**
   * Get all projects (paginated)
   */
  getProjects: async (filters?: ProjectFilters): Promise<PaginatedProjects> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);

    return api.get<PaginatedProjects>(`/api/projects/?${params.toString()}`);
  },

  /**
   * Get single project by ID
   */
  getProject: async (id: number): Promise<Project> => {
    return api.get<Project>(`/api/projects/${id}/`);
  },

  /**
   * Create new project
   */
  createProject: async (data: ProjectInput): Promise<Project> => {
    return api.post<Project>('/api/projects/', data);
  },

  /**
   * Update existing project
   */
  updateProject: async (id: number, data: Partial<ProjectInput>): Promise<Project> => {
    return api.patch<Project>(`/api/projects/${id}/`, data);
  },

  /**
   * Delete project
   */
  deleteProject: async (id: number): Promise<void> => {
    return api.delete(`/api/projects/${id}/`);
  },
};
