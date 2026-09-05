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

export function mapRelease(raw: any): Release {
  const size = raw.artifact?.size != null ? Number(raw.artifact.size) : 0;
  return {
    id: raw.id,
    version: raw.version,
    application: raw.application,
    releaseNotes: raw.releaseNotes,
    status: raw.status,
    fileName: raw.artifact?.fileName || '',
    fileSize: size,
    sha256: raw.artifact?.sha256 || '',
    createdAt: raw.createdAt,
    publishedAt: raw.publishedAt,
  };
}

export function useReleases(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['releases', params],
    queryFn: async () => {
      const { data } = await api.get('/releases', { params });
      const body = data.data as { data: any[]; total: number; page: number; limit: number };
      return {
        data: (body.data || []).map(mapRelease),
        total: body.total,
        page: body.page,
        limit: body.limit,
      };
    },
  });
}

export function useRelease(id: string) {
  return useQuery({
    queryKey: ['release', id],
    queryFn: async () => {
      const { data } = await api.get(`/releases/${id}`);
      return mapRelease(data.data);
    },
    enabled: !!id,
  });
}