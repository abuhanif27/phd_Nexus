import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { projectsApi } from './api';
import { ProjectInput, ProjectFilters } from './schemas';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/lib/api/errors';

/**
 * Query keys for projects
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectKeys.details(), id] as const,
};

/**
 * Hook to fetch projects list
 */
export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsApi.getProjects(filters),
    placeholderData: keepPreviousData, // Keep old data while fetching new
  });
}

/**
 * Hook to fetch single project
 */
export function useProject(id: number) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getProject(id),
  });
}

/**
 * Hook to create project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      toast({
        title: 'Success!',
        description: 'Project created successfully.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create project',
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to update project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProjectInput> }) =>
      projectsApi.updateProject(id, data),
    onSuccess: (data) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.id) });

      toast({
        title: 'Success!',
        description: 'Project updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update project',
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook to delete project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsApi.deleteProject,
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      // Snapshot previous value
      const previousProjects = queryClient.getQueryData(projectKeys.lists());

      // Optimistically update (remove from cache)
      queryClient.setQueriesData({ queryKey: projectKeys.lists() }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          results: old.results?.filter((project: any) => project.id !== id),
          count: (old.count || 0) - 1,
        };
      });

      return { previousProjects };
    },
    onError: (error, _id, context) => {
      // Revert optimistic update on error
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }

      toast({
        variant: 'destructive',
        title: 'Failed to delete project',
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'Project deleted successfully.',
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
