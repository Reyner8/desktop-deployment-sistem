import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/axios';

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  result: string;
  timestamp: string;
}

export function useAuditLogs(params?: { actor?: string; action?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: async () => {
      const { data } = await api.get('/audit', { params });
      const body = data.data as { data: any[]; total: number; page: number; limit: number };
      return {
        data: body.data || [],
        total: body.total,
        page: body.page,
        limit: body.limit,
      };
    },
  });
}