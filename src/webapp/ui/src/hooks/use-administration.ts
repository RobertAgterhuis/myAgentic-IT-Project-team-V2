import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  AdminUsersResponse,
  AdministrationOverviewResponse,
  PolicySignalsResponse,
  TimestampedResponse,
  DashboardHealth,
} from '@/lib/api-types';

/** Fetch user directory for administration/RBAC management views. */
export function useAdminUsers() {
  return useQuery({
    queryKey: queryKeys.administration.users,
    queryFn: () => apiGet<AdminUsersResponse>('/admin/users'),
  });
}

/** Build a compact integrations + RBAC overview from existing APIs. */
export function useAdministrationOverview() {
  return useQuery({
    queryKey: queryKeys.administration.integrations,
    queryFn: async (): Promise<AdministrationOverviewResponse> => {
      const [usersRes, signalsRes, healthRes] = await Promise.all([
        apiGet<AdminUsersResponse>('/admin/users'),
        apiGet<PolicySignalsResponse>('/v1/policies/signals'),
        apiGet<TimestampedResponse<DashboardHealth>>('/dashboard/health'),
      ]);

      const role_counts = {
        admin: usersRes.users.filter((user) => user.role === 'admin').length,
        operator: usersRes.users.filter((user) => user.role === 'operator').length,
        viewer: usersRes.users.filter((user) => user.role === 'viewer').length,
      };

      const checks = signalsRes.checks ?? {};
      const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).length;

      const integrations = [
        {
          id: 'policy-signals',
          label: 'Policy signal pipeline',
          status: (failedChecks === 0 ? 'healthy' : failedChecks < 3 ? 'degraded' : 'offline') as
            | 'healthy'
            | 'degraded'
            | 'offline',
          detail: `${Object.keys(checks).length} checks, ${failedChecks} failing`,
        },
        {
          id: 'quality-health',
          label: 'Quality telemetry',
          status: (healthRes.data.quality.status === 'ok'
            ? 'healthy'
            : healthRes.data.quality.status === 'warning'
              ? 'degraded'
              : 'offline') as 'healthy' | 'degraded' | 'offline',
          detail: String(healthRes.data.quality.details ?? healthRes.data.quality.label),
        },
        {
          id: 'deployment-health',
          label: 'Deployment telemetry',
          status: (healthRes.data.deployment.status === 'ok'
            ? 'healthy'
            : healthRes.data.deployment.status === 'warning'
              ? 'degraded'
              : 'offline') as 'healthy' | 'degraded' | 'offline',
          detail: String(healthRes.data.deployment.details ?? healthRes.data.deployment.label),
        },
      ];

      return {
        ok: true,
        role_counts,
        integrations,
      };
    },
    staleTime: 20_000,
  });
}
