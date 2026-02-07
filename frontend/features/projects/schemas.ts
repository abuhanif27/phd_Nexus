import { z } from 'zod';

/**
 * Project schema
 */
export const projectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  createdAt: z.string(),
  updatedAt: z.string(),
  owner: z.number(),
});

export type Project = z.infer<typeof projectSchema>;

/**
 * Project input schema (for create/update)
 */
export const projectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

/**
 * Paginated projects response
 */
export const paginatedProjectsSchema = z.object({
  count: z.number(),
  next: z.string().url().nullable(),
  previous: z.string().url().nullable(),
  results: z.array(projectSchema),
});

export type PaginatedProjects = z.infer<typeof paginatedProjectsSchema>;

/**
 * Project filters/params
 */
export interface ProjectFilters {
  page?: number;
  search?: string;
  status?: string;
}
