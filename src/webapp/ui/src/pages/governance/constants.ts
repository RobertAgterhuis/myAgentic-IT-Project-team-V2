/**
 * Governance constants — status badge mapping.
 * Extracted from governance-dashboard-page (M15-009).
 */
export const statusVariant: Record<string, 'warning' | 'success' | 'error' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  EXPIRED: 'secondary',
};
