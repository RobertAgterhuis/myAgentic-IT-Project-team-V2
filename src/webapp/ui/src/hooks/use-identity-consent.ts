import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export type AgentRoleId =
  | 'orchestrator'
  | 'product'
  | 'architect'
  | 'developer'
  | 'ui'
  | 'qa'
  | 'devops'
  | 'infra'
  | 'security'
  | 'data'
  | 'documentation'
  | 'sre';

export type ConsentStatus =
  | 'not_configured'
  | 'pending_consent'
  | 'consent_granted'
  | 'consent_revoked'
  | 'auth_pending'
  | 'blocked_by_policy';

export interface ConsentCenterEntry {
  agent_role: AgentRoleId;
  consent_status: ConsentStatus;
  credential_type: 'managed_identity' | 'workload_federation' | 'certificate' | 'client_secret';
  credential_expires_at: string | null;
  requires_admin_consent: boolean;
  user_consents_required: string[];
  effective_enabled: boolean;
  last_check: string;
}

interface ConsentCenterResponse {
  ok: boolean;
  count: number;
  entries: ConsentCenterEntry[];
}

interface ConsentActionResponse {
  ok: boolean;
  action: 'grant' | 'revoke' | 'refresh';
  role: AgentRoleId;
  admin_consent_url?: string;
}

export function useIdentityConsentCenter() {
  return useQuery({
    queryKey: queryKeys.identity.consentCenter,
    queryFn: () => apiGet<ConsentCenterResponse>('/v1/identity/consent-center'),
    refetchInterval: 15_000,
  });
}

export function useGrantIdentityConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: AgentRoleId) =>
      apiPost<ConsentActionResponse>(`/v1/identity/consent/${encodeURIComponent(role)}/grant`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.consentCenter }),
  });
}

export function useRevokeIdentityConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: AgentRoleId) =>
      apiPost<ConsentActionResponse>(`/v1/identity/consent/${encodeURIComponent(role)}/revoke`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.consentCenter }),
  });
}

export function useRefreshIdentityConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: AgentRoleId) =>
      apiPost<ConsentActionResponse>(`/v1/identity/consent/${encodeURIComponent(role)}/refresh`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.identity.consentCenter }),
  });
}
