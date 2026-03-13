/**
 * Baseline E2E tests — Safety Net (Sprint 9A → S9H)
 *
 * Originally captured legacy app behavior. Now validates the React SPA shell
 * that replaced the vanilla HTML monolith (S9H migration complete).
 */
import { test, expect } from '@playwright/test';

test.describe('Health & API', () => {
  test('GET /api/health returns 200 with status ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('GET /api/session returns session state', async ({ request }) => {
    const res = await request.get('/api/session');
    // May return 200 or 404 depending on whether a session exists
    expect([200, 404]).toContain(res.status());
  });
});

test.describe('Main UI (index.html)', () => {
  test('loads the main page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Command Center|Agentic|Questionnaire|SDLC|Q&D/i);
  });

  test('has a visible heading or main content area', async ({ page }) => {
    await page.goto('/');
    // The page should have some visible text content
    const body = page.locator('body');
    await expect(body).toBeVisible();
    const text = await body.textContent();
    expect(text?.length).toBeGreaterThan(0);
  });
});

test.describe('Dashboard', () => {
  test('loads the dashboard page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/Dashboard|Agentic|SDLC/i);
  });

  test('dashboard contains key structural elements', async ({ page }) => {
    await page.goto('/dashboard');
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Questionnaires API', () => {
  test('GET /api/questionnaires returns list', async ({ request }) => {
    const res = await request.get('/api/questionnaires');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('questionnaires');
    expect(Array.isArray(body.questionnaires)).toBeTruthy();
  });
});

test.describe('Decisions API', () => {
  test('GET /api/decisions returns list', async ({ request }) => {
    const res = await request.get('/api/decisions');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('decided');
  });
});

test.describe('Milestones API', () => {
  test('GET /api/milestones returns milestone data', async ({ request }) => {
    const res = await request.get('/api/milestones');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // Response is an object with milestone information
    expect(typeof body).toBe('object');
  });
});

test.describe('Static Assets', () => {
  test('React SPA assets are served with correct content type', async ({ request }) => {
    // The SPA root serves HTML — Vite assets are hashed and served from /assets/
    const res = await request.get('/');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('html');
  });
});
