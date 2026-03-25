/**
 * Auth hooks (M29-006) — React Query hook for current-user endpoint
 * and logout mutation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';
import { useEffect } from 'react';

export type RoleRequirement = AuthUser['role'];

const ROLE_ORDER: RoleRequirement[] = ['viewer', 'operator', 'admin'];

function getRoleRank(role: RoleRequirement | null | undefined): number {
  if (!role) return -1;
  return ROLE_ORDER.indexOf(role);
}

export function hasRequiredRole(
  role: RoleRequirement | null | undefined,
  requiredRole: RoleRequirement
): boolean {
  return getRoleRank(role) >= getRoleRank(requiredRole);
}

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Auth check failed: ${res.status}`);
  const body = await res.json();

  // Support both response shapes:
  // 1) flat user payload: { id, role, ... }
  // 2) nested payload: { data: { user: { ... } } }
  if (body && typeof body === 'object' && 'id' in body && 'role' in body) {
    return body as AuthUser;
  }

  return body?.data?.user ?? null;
}

async function postLogout(): Promise<void> {
  // Read CSRF token from cookie. Support both the current cookie name (`csrf`)
  // and the legacy name (`csrf_token`) for local compatibility.
  const csrfCookie = document.cookie
    .split('; ')
    .find((c) => c.startsWith('csrf=') || c.startsWith('csrf_token='));
  const csrfToken = csrfCookie?.split('=')[1] ?? '';

  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': csrfToken },
  });
  if (!res.ok && res.status !== 401) throw new Error('Logout failed');
}

/** Fetches /api/auth/me on mount and syncs result into auth store. */
export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);

  const query = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (query.isSuccess || query.isError) {
      setUser(query.data ?? null);
    }
  }, [query.data, query.isSuccess, query.isError, setUser]);

  return query;
}

/** Mutation that calls POST /api/auth/logout, then clears auth state. */
export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: postLogout,
    onSuccess: () => {
      logout();
      queryClient.setQueryData(['auth', 'me'], null);
    },
  });
}

export function useAuthorization() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    hasRequiredRole: (requiredRole: RoleRequirement) => hasRequiredRole(user?.role, requiredRole),
  };
}
