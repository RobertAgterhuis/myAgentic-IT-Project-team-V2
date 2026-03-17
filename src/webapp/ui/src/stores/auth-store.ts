/**
 * Auth store (M29-006) — Manages client-side authentication state.
 * Server-authoritative: the cookie session is the source of truth;
 * this store caches the current user for UI rendering.
 */
import { create } from 'zustand';

export interface AuthUser {
  id: number;
  github_id: number;
  login: string;
  display_name: string;
  avatar_url: string;
  role: 'admin' | 'operator' | 'viewer';
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, loading: false }),
}));
