export type FeatureFlag =
  | 'overview-redesign'
  | 'runs-redesign'
  | 'approvals-redesign'
  | 'policies-redesign'
  | 'agents-redesign'
  | 'observability-redesign'
  | 'audit-redesign';

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  'overview-redesign': true,
  'runs-redesign': false,
  'approvals-redesign': false,
  'policies-redesign': false,
  'agents-redesign': false,
  'observability-redesign': false,
  'audit-redesign': false,
};

const STORAGE_KEY = 'agentic.ui.featureFlags';

function readUrlOverrides(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('ff');
  if (!raw) return {};

  return raw.split(',').reduce<Record<string, boolean>>((acc, token) => {
    const trimmed = token.trim();
    if (!trimmed) return acc;
    if (trimmed.startsWith('!') || trimmed.startsWith('-')) {
      acc[trimmed.slice(1)] = false;
      return acc;
    }
    acc[trimmed] = true;
    return acc;
  }, {});
}

function readStoredOverrides(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const urlOverrides = readUrlOverrides();
  if (flag in urlOverrides) return Boolean(urlOverrides[flag]);

  const storedOverrides = readStoredOverrides();
  if (flag in storedOverrides) return Boolean(storedOverrides[flag]);

  return DEFAULT_FLAGS[flag];
}

export function setFeatureFlag(flag: FeatureFlag, enabled: boolean): void {
  if (typeof window === 'undefined') return;
  const storedOverrides = readStoredOverrides();
  storedOverrides[flag] = enabled;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedOverrides));
}

export function selectVariant<T>(flag: FeatureFlag, legacy: T, redesign: T): T {
  return isFeatureEnabled(flag) ? redesign : legacy;
}
