/**
 * E2E tests — Decisions page (S9G-36, Issue #243)
 *
 * Tests the decisions API lifecycle: create → decide → defer → expire.
 */
import { test, expect } from '@playwright/test';

test.describe('Decisions API', () => {
  test('GET /api/decisions returns structured data', async ({ request }) => {
    const res = await request.get('/api/decisions');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();

    expect(body).toHaveProperty('open');
    expect(body).toHaveProperty('decided');
    expect(body).toHaveProperty('deferred');
    expect(Array.isArray(body.open)).toBeTruthy();
    expect(Array.isArray(body.decided)).toBeTruthy();
    expect(Array.isArray(body.deferred)).toBeTruthy();
  });

  test('open decisions have required fields', async ({ request }) => {
    const res = await request.get('/api/decisions');
    const body = await res.json();

    if (body.open.length === 0) {
      test.skip();
      return;
    }

    const d = body.open[0];
    expect(d).toHaveProperty('id');
    expect(d).toHaveProperty('status');
    expect(d).toHaveProperty('scope');
    expect(d.status).toBe('OPEN');
  });

  test('decided decisions have required fields', async ({ request }) => {
    const res = await request.get('/api/decisions');
    const body = await res.json();

    if (body.decided.length === 0) {
      test.skip();
      return;
    }

    const d = body.decided[0];
    expect(d).toHaveProperty('id');
    expect(d).toHaveProperty('status');
    expect(d.status).toBe('DECIDED');
  });

  test('POST /api/decisions creates a new decision', async ({ request }) => {
    const res = await request.post('/api/decisions', {
      data: {
        action: 'create',
        type: 'OPEN_QUESTION',
        priority: 'MEDIUM',
        scope: 'e2e-test',
        text: 'E2E test decision — should we automate?',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body).toHaveProperty('id');
    expect(['created_open_question', 'created_decision']).toContain(body.action);
  });

  test('decision lifecycle: create → decide', async ({ request }) => {
    // Step 1: Create
    const createRes = await request.post('/api/decisions', {
      data: {
        action: 'create',
        type: 'OPEN_QUESTION',
        priority: 'HIGH',
        scope: 'e2e-lifecycle',
        text: 'Lifecycle test — decide step',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id } = await createRes.json();

    // Step 2: Decide
    const decideRes = await request.post('/api/decisions', {
      data: {
        action: 'decide',
        id,
        answer: 'Yes, we should. Automated E2E lifecycle test',
      },
    });
    expect(decideRes.ok()).toBeTruthy();
    const decideBody = await decideRes.json();
    expect(decideBody.ok).toBe(true);
    expect(decideBody.action).toBe('decided');

    // Step 3: Verify it moved to decided
    const listRes = await request.get('/api/decisions');
    const list = await listRes.json();
    const found = list.decided.find((d: { id: string }) => d.id === id);
    expect(found).toBeTruthy();
    expect(found.status).toBe('DECIDED');
  });

  test('POST /api/decisions rejects invalid action', async ({ request }) => {
    const res = await request.post('/api/decisions', {
      data: { action: 'invalid_action' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/decisions rejects empty body', async ({ request }) => {
    const res = await request.post('/api/decisions', {
      data: {},
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
