/**
 * E2E tests — Metrics page (S9G-38, Issue #245)
 *
 * Tests the drift detection and progress APIs.
 */
import { test, expect } from '@playwright/test';

test.describe('Drift Detection API', () => {
  test('GET /api/drift returns drift report', async ({ request }) => {
    const res = await request.get('/api/drift');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('drifts');
    expect(body).toHaveProperty('in_sync');
    expect(body).toHaveProperty('generated_at');

    expect(body.summary).toHaveProperty('total_drifts');
    expect(body.summary).toHaveProperty('critical');
    expect(body.summary).toHaveProperty('warning');
    expect(body.summary).toHaveProperty('info');
  });

  test('drift entries have required fields', async ({ request }) => {
    const res = await request.get('/api/drift');
    const body = await res.json();

    if (body.drifts.length === 0) {
      // No drifts is a valid state
      expect(body.summary.total_drifts).toBe(0);
      return;
    }

    const drift = body.drifts[0];
    expect(drift).toHaveProperty('id');
    expect(drift).toHaveProperty('type');
    expect(drift).toHaveProperty('severity');
    expect(['CRITICAL', 'WARNING', 'INFO']).toContain(drift.severity);
  });

  test('in_sync data has sprints array', async ({ request }) => {
    const res = await request.get('/api/drift');
    const body = await res.json();

    expect(Array.isArray(body.in_sync.sprints)).toBeTruthy();
    expect(typeof body.in_sync.stories).toBe('number');
  });
});

test.describe('Progress API', () => {
  test('GET /api/progress returns phase progress', async ({ request }) => {
    const res = await request.get('/api/progress');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('phases');
    expect(Array.isArray(body.phases)).toBeTruthy();
  });

  test('phase entries have completion data', async ({ request }) => {
    const res = await request.get('/api/progress');
    const body = await res.json();

    if (body.phases.length === 0) {
      test.skip();
      return;
    }

    const phase = body.phases[0];
    expect(phase).toHaveProperty('key');
    expect(phase).toHaveProperty('label');
    expect(phase).toHaveProperty('total');
    expect(phase).toHaveProperty('done');
    expect(typeof phase.total).toBe('number');
    expect(typeof phase.done).toBe('number');
  });

  test('progress includes sprint statuses', async ({ request }) => {
    const res = await request.get('/api/progress');
    const body = await res.json();

    expect(body).toHaveProperty('sprints');
    expect(body.sprints).toHaveProperty('total');
    expect(body.sprints).toHaveProperty('statuses');
  });
});
