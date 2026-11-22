import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Category, Platform, Settings } from '@moneta/shared';
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => ({ message: 'No se pudo conectar con Moneta.' }))) as { message?: string };
    throw new Error(error.message ?? 'No se pudo completar la operación.');
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}
export function useApi<T>(path: string) {
  return useQuery({ queryKey: ['api', path], queryFn: () => api<T>(path) });
}
export function useSave<T = unknown>(path: string, method = 'POST', message = 'Cambios guardados') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body?: unknown) => api<T>(path, method, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['api'] });
      toast.success(message);
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
export const useCategories = () => useApi<Category[]>('/categories');
export const usePlatforms = () => useApi<Platform[]>('/platforms');
export const useSettings = () => useApi<Settings>('/settings');
