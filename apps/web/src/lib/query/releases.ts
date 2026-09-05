import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/axios';

export interface Release {
  id: string;
  version: string;
  application: string;
  releaseNotes: string;
  status: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
  publishedAt?: string;
}

export function useReleases(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['releases', params],
    queryFn: async () => {
      const { data } = await api.get('/releases', { params });
      return data as { data: Release[]; total: number; page: number; limit: number };
    },
  });
}

export function useRelease(id: string) {
  return useQuery({
    queryKey: ['release', id],
    queryFn: async () => {
      const { data } = await api.get(`/releases/${id}`);
      return data as Release;
    },
    enabled: !!id,
  });
}