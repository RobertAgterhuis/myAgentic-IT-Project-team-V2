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

function sendMetric(metric: Metric): void {
  // Use sendBeacon when available (non-blocking, survives page unload).
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
  } else {
    // Fallback: fire-and-forget fetch (ignored if it fails).
    fetch(ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {
      // Intentionally silent — metrics loss is acceptable.
    });
  }
}

export function initWebVitals(): void {
  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
}
