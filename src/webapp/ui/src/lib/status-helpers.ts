/**
 * Shared status-to-badge mappings for orchestrator, session, queue, and approval surfaces.
 * Centralises duplicated statusVariant/statusConfig records from individual pages.
 * P1-UI-E1-I2 — Remove duplicated domain UI behavior
 */

/** Badge variant type used across the design system */
export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'secondary';

// ── Orchestrator command queue status ─────────────────────────────────────────────
export const commandQueueStatusVariant: Record<string, BadgeVariant> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  DONE: 'success',
  ERROR: 'error',
};

// ── Approval status ───────────────────────────────────────────────────────────────
export const approvalStatusVariant: Record<string, 'success' | 'warning' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'secondary',
};

// ── Session / execution status ────────────────────────────────────────────────────
export const sessionStatusVariant: Record<
  string,
  'success' | 'warning' | 'error' | 'info' | 'secondary'
> = {
  active: 'info',
  completed: 'success',
  failed: 'error',
  paused: 'warning',
};

export type SessionStatusTone = 'critical' | 'warning' | 'success' | 'info';

/**
 * Maps a Tailwind badge variant to the tone string used by PageHeader chips.
 */
export function badgeVariantToTone(variant: BadgeVariant): SessionStatusTone | 'default' {
  switch (variant) {
    case 'error':
      return 'critical';
    case 'warning':
      return 'warning';
    case 'success':
      return 'success';
    case 'info':
      return 'info';
    default:
      return 'default';
  }
}
