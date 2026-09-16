import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api/axios';

export interface HealthStatus {
  status: string;
  timestamp: string;
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await api.get<HealthStatus>('/health');
      return data;
    },
    refetchInterval: 30000,
    retry: false,
  });
}
