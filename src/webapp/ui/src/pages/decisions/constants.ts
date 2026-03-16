/* Badge/status mappings for decisions */
export const statusBadge: Record<string, 'warning' | 'success' | 'secondary' | 'error'> = {
  OPEN: 'warning',
  DECIDED: 'success',
  DEFERRED: 'secondary',
  EXPIRED: 'error',
};

export const priorityBadge: Record<string, 'error' | 'warning' | 'info'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
};
