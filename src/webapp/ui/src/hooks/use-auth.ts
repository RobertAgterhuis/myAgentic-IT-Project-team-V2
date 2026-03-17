/**
 * Auth hooks (M29-006) — React Query hook for current-user endpoint
 * and logout mutation.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, type AuthUser } from '@/stores/auth-store';
import { useEffect } from 'react';

async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Auth check failed: ${res.status}`);
  const body = await res.json();
  return body.data?.user ?? null;
}

async function postLogout(): Promise<void> {
  // Read CSRF token from cookie
  const csrfCookie = document.cookie.split('; ').find((c) => c.startsWith('csrf_token='));
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
