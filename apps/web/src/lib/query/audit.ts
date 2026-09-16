import { useQuery } from '@tanstack/react-query';
import type {
  ApiResponse,
  AuditLogEntry,
  PaginatedResult,
  PaginationQuery,
} from '@rscb/shared';
import { AuditAction } from '@rscb/shared';
import api from '@/lib/api/axios';

export type { AuditLogEntry as AuditLog };

export interface AuditQuery extends PaginationQuery {
  actor?: string;
  action?: AuditAction;
}

export function useAuditLogs(params?: AuditQuery) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<AuditLogEntry>>>('/audit', {
        params,
      });
      const body = data.data!;
      return {
        data: body.data,
        total: body.total,
        page: body.page,
        limit: body.limit,
        totalPages: body.totalPages,
      };
    },
  });
}
