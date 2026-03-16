/**
 * Metrics page constants — severity badges, icons, export helper.
 * Extracted from metrics-page (M15-008).
 */
import type { DriftEntry, DriftSeverity } from '@/lib/api-types';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

export const severityBadge: Record<DriftSeverity, 'error' | 'warning' | 'info'> = {
  CRITICAL: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

export const severityIcons: Record<DriftSeverity, React.ReactNode> = {
  CRITICAL: <ShieldAlert className="size-4 text-red-600" />,
  WARNING: <AlertTriangle className="size-4 text-amber-500" />,
  INFO: <Info className="size-4 text-blue-500" />,
};

export function exportData(drifts: DriftEntry[], format: 'json' | 'csv') {
  let content: string;
  let mime: string;
  let ext: string;

  if (format === 'json') {
    content = JSON.stringify(drifts, null, 2);
    mime = 'application/json';
    ext = 'json';
  } else {
    const headers = ['id', 'type', 'severity', 'sprint', 'expected', 'actual', 'recommendation'];
    const rows = drifts.map((d) =>
      headers
        .map((h) => `"${String(d[h as keyof DriftEntry] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    content = [headers.join(','), ...rows].join('\n');
    mime = 'text/csv';
    ext = 'csv';
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drift-report.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}
