// Copyright (c) 2026 Robert Agterhuis. MIT License.

export function deriveEnvScope(profile: string | undefined): 'dev' | 'test' | 'prod' {
  if (!profile) return 'dev';
  if (profile.startsWith('production-')) return 'prod';
  if (profile.startsWith('test-')) return 'test';
  return 'dev';
}

export function shouldFallbackProvider(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /(auth|api.?key|credential|rate.?limit|401|429|503|timeout|timed out|econn|network|provider not found|failed validation)/i.test(
    message
  );
}
