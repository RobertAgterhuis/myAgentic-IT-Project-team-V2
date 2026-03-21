/**
 * Visual Regression Feasibility Spec — UI-022 / Phase 4
 *
 * These tests capture pixel-level screenshots of key UI surfaces to detect
 * unintentional visual regressions after re-renders, theme changes, or component updates.
 *
 * Run with: npx playwright test --project=visual-regression
 * Update snapshots: npx playwright test --project=visual-regression --update-snapshots
 *
 * NOTE: Snapshots are committed to the repository and act as ground truth.
 * When intentional design changes are made, regenerate with --update-snapshots.
 */
import { test, expect } from '@playwright/test';

test.describe('Visual regression — core pages', () => {
  test('overview page renders without visual diff', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('overview-page.png', { fullPage: false });
  });

  test('governance page renders without visual diff', async ({ page }) => {
    await page.goto('/governance');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('governance-page.png', { fullPage: false });
  });

  test('observability page renders without visual diff', async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('observability-page.png', { fullPage: false });
  });

  test('audit page renders without visual diff', async ({ page }) => {
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('audit-page.png', { fullPage: false });
  });

  test('approvals page renders without visual diff', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('approvals-page.png', { fullPage: false });
  });
});

test.describe('Visual regression — navigation', () => {
  test('app sidebar / navigation renders without visual diff', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('nav[aria-label]').first();
    await expect(nav).toHaveScreenshot('app-nav.png');
  });
});

test.describe('Visual regression — observability tabs', () => {
  test('alerts tab content renders without visual diff', async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /^alerts$/i }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('observability-alerts-tab.png', { fullPage: false });
  });

  test('telemetry streams tab content renders without visual diff', async ({ page }) => {
    await page.goto('/observability');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /telemetry streams/i }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveScreenshot('observability-streams-tab.png', { fullPage: false });
  });
});
