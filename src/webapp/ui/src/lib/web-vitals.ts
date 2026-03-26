/**
 * Web Vitals reporting — P1-UI-E3-I3.
 *
 * Collects CLS, INP, LCP and reports them to the backend metrics endpoint.
 * Called once from main.tsx after app mount.
 *
 * The metrics endpoint is best-effort: failures are silently ignored so
 * a metrics outage never affects the user-facing application.
 */
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

const ENDPOINT = '/api/v1/metrics/vitals';

function readCsrfToken(): string {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('csrf=') || entry.startsWith('csrf_token='));
  return cookie?.split('=')[1] ?? '';
}

function sendMetric(metric: Metric): void {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Best-effort fetch with credentials and CSRF support. We avoid sendBeacon
  // here because it cannot attach the required CSRF header for authenticated
  // sessions.
  fetch(ENDPOINT, {
    method: 'POST',
    body,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': readCsrfToken(),
    },
    keepalive: true,
  }).catch(() => {
    // Intentionally silent — metrics loss is acceptable.
  });
}

export function initWebVitals(): void {
  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
}
