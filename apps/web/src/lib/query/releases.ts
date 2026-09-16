import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, PaginatedResult, PaginationQuery, ReleaseInfo } from '@rscb/shared';
import { ReleaseStatus } from '@rscb/shared';
import api from '@/lib/api/axios';

export interface Release {
  id: string;
  version: string;
  application: string;
  releaseNotes: string;
  status: ReleaseStatus;
  fileName: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
  publishedAt?: string;
}

export interface ReleaseQuery extends PaginationQuery {
  status?: ReleaseStatus;
}

export function mapRelease(raw: ReleaseInfo): Release {
  const size = raw.artifact?.size != null ? Number(raw.artifact.size) : 0;
  return {
    id: raw.id,
    version: raw.version,
    application: raw.application,
    releaseNotes: raw.releaseNotes || '',
    status: raw.status,
    fileName: raw.artifact?.fileName || '',
    fileSize: size,
    sha256: raw.artifact?.sha256 || '',
    createdAt: raw.createdAt,
    publishedAt: raw.publishedAt || undefined,
  };
}

export function useReleases(params?: ReleaseQuery) {
  return useQuery({
    queryKey: ['releases', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<ReleaseInfo>>>('/releases', {
        params,
      });
      const body = data.data!;
      return {
        data: body.data.map(mapRelease),
        total: body.total,
        page: body.page,
        limit: body.limit,
        totalPages: body.totalPages,
      };
    },
  });
}

export function useRelease(id: string) {
  return useQuery({
    queryKey: ['release', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ReleaseInfo>>(`/releases/${id}`);
      return mapRelease(data.data!);
    },
    enabled: !!id,
  });
}

export function useCreateRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      application: string;
      version: string;
      releaseNotes?: string;
    }) => {
      const { data } = await api.post<ApiResponse<ReleaseInfo>>('/releases', payload);
      return mapRelease(data.data!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
    },
  });
}

export function useUploadArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ releaseId, file }: { releaseId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/releases/${releaseId}/artifact`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['release'] });
    },
  });
}

export function usePublishRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<ReleaseInfo>>(`/releases/${id}/publish`);
      return mapRelease(data.data!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['release'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useArchiveRelease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<ReleaseInfo>>(`/releases/${id}/archive`);
      return mapRelease(data.data!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] });
      queryClient.invalidateQueries({ queryKey: ['release'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
