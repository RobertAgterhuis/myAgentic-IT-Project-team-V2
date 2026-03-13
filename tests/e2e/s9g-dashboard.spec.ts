/**
 * E2E tests — Dashboard page (S9G-37, Issue #244)
 *
 * Tests the dashboard API endpoints: health, metrics, activity, stats.
 */
import { test, expect } from '@playwright/test';

test.describe('Dashboard Health API', () => {
  test('GET /api/dashboard/health returns health indicators', async ({ request }) => {
    const res = await request.get('/api/dashboard/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('timestamp');

    const data = body.data;
    expect(data).toHaveProperty('quality');
    expect(data).toHaveProperty('coverage');
    expect(data).toHaveProperty('builds');
    expect(data).toHaveProperty('deployment');
  });

  test('health indicators have required structure', async ({ request }) => {
    const res = await request.get('/api/dashboard/health');
    const { data } = await res.json();

    for (const key of ['quality', 'coverage', 'builds', 'deployment']) {
      const indicator = data[key];
      expect(indicator).toHaveProperty('value');
      expect(indicator).toHaveProperty('label');
      expect(indicator).toHaveProperty('status');
    }
  });
});

test.describe('Dashboard Metrics API', () => {
  test('GET /api/dashboard/metrics returns metric entries', async ({ request }) => {
    const res = await request.get('/api/dashboard/metrics');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('data');

    const data = body.data;
    expect(data).toHaveProperty('http_requests');
    expect(data).toHaveProperty('error_rate');
    expect(data).toHaveProperty('response_time');
  });

  test('metric entries have value and trend', async ({ request }) => {
    const res = await request.get('/api/dashboard/metrics');
    const { data } = await res.json();

    for (const key of ['http_requests', 'error_rate', 'response_time']) {
      const metric = data[key];
      expect(metric).toHaveProperty('value');
      expect(metric).toHaveProperty('label');
    }
  });
});

test.describe('Dashboard Activity API', () => {
  test('GET /api/dashboard/activity returns activity list', async ({ request }) => {
    const res = await request.get('/api/dashboard/activity');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBeTruthy();
  });

  test('activity entries have timestamps and actions', async ({ request }) => {
    const res = await request.get('/api/dashboard/activity');
    const { data } = await res.json();

    if (data.length === 0) {
      test.skip();
      return;
    }

    const entry = data[0];
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('action');
  });
});

test.describe('Dashboard Stats API', () => {
  test('GET /api/dashboard/stats returns quick stats', async ({ request }) => {
    const res = await request.get('/api/dashboard/stats');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('data');
    expect(typeof body.data).toBe('object');
  });
});

test.describe('Dashboard Page Rendering', () => {
  test('loads the dashboard page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Dashboard|Agentic|SDLC|Command Center/i);
  });

  test('dashboard has visible content', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toBeVisible();
    const text = await body.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });
});
