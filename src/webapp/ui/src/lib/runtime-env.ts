export interface RuntimeEnvContract {
  apiBaseUrl: string;
  sseEndpoint: string;
  enableChatStreaming: boolean;
}

export interface RuntimeEnvValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  env: RuntimeEnvContract;
}

function normalizeBoolean(value: string | undefined, fallback: boolean): boolean | null {
  if (value == null || value.trim() === '') return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return null;
}

function isValidEndpoint(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('/')) return true;
  if (value.startsWith('http://') || value.startsWith('https://')) return true;
  return false;
}

export function resolveRuntimeEnv(raw: ImportMetaEnv = import.meta.env): RuntimeEnvContract {
  const enableStreamingRaw = normalizeBoolean(raw.VITE_ENABLE_CHAT_STREAMING, true);
  return {
    apiBaseUrl: (raw.VITE_API_BASE_URL || '/api').trim() || '/api',
    sseEndpoint: (raw.VITE_SSE_ENDPOINT || '/api/events').trim() || '/api/events',
    enableChatStreaming: enableStreamingRaw == null ? true : enableStreamingRaw,
  };
}

export function validateRuntimeEnv(raw: ImportMetaEnv = import.meta.env): RuntimeEnvValidation {
  const env = resolveRuntimeEnv(raw);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidEndpoint(env.apiBaseUrl)) {
    errors.push('VITE_API_BASE_URL must start with "/", "http://", or "https://".');
  }

  if (!isValidEndpoint(env.sseEndpoint)) {
    errors.push('VITE_SSE_ENDPOINT must start with "/", "http://", or "https://".');
  }

  const streamingParsed = normalizeBoolean(raw.VITE_ENABLE_CHAT_STREAMING, true);
  if (streamingParsed == null) {
    errors.push('VITE_ENABLE_CHAT_STREAMING must be "true" or "false" when provided.');
  }

  if (env.sseEndpoint.includes('events') && !env.enableChatStreaming) {
    warnings.push('SSE endpoint is configured but chat streaming is disabled.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    env,
  };
}
