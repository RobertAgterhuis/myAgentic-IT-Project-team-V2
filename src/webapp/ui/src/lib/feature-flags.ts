/**
 * Feature flags — runtime toggles for experimental features.
 *
 * Note: UI redesign phase flags (overview-redesign, runs-redesign, etc.) were
 * used during Phase 1-5 for parity validation. As of Phase 6 (UI-023), all
 * legacy components have been removed and these flags are no longer applicable.
 *
 * Consider this file as the infrastructure for future feature flags, or
 * these flags could be used for A/B testing specific features if needed.
 */

export type FeatureFlag = 'reserved-for-future-use';

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  'reserved-for-future-use': false,
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
