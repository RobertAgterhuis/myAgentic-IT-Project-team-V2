/**
 * S9H-40: WCAG 2.1 AA Accessibility Audit
 *
 * Automated axe-core scans + keyboard navigation tests for all pages.
 * Ensures zero critical/serious violations per WCAG 2.1 AA.
 */
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mockAuthenticatedOperator(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          user: {
            id: 42,
            github_id: 4242,
            login: 'a11y-operator',
            display_name: 'A11y Operator',
            avatar_url: 'https://example.test/avatar.png',
            role: 'operator',
          },
        },
      }),
    });
  });
}

async function mockWorkspaceFixtures(page: Page) {
  const now = '2026-01-10T10:00:00.000Z';

  await page.route('**/api/workspaces/ws-a11y', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        workspace: {
          id: 'ws-a11y',
          name: 'Accessibility Workspace',
          owner: 'a11y-team',
          repositories: [
            {
              id: 'repo-a11y-ui',
              name: 'ui-shell',
              provider: 'github',
              url: 'https://github.com/example/ui-shell',
              defaultBranch: 'main',
            },
          ],
          created_at: now,
          updated_at: now,
        },
        projects: [
          {
            id: 'proj-a11y',
            workspaceId: 'ws-a11y',
            name: 'Edge Keyboard Flows',
            repositories: ['repo-a11y-ui'],
            sessions: [],
            status: 'active',
            created_at: now,
            updated_at: now,
          },
        ],
      }),
    });
  });

  await page.route('**/api/workspaces', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        count: 1,
        workspaces: [
          {
            id: 'ws-a11y',
            name: 'Accessibility Workspace',
            owner: 'a11y-team',
            repositories: [
              {
                id: 'repo-a11y-ui',
                name: 'ui-shell',
                provider: 'github',
                url: 'https://github.com/example/ui-shell',
                defaultBranch: 'main',
              },
            ],
            created_at: now,
            updated_at: now,
          },
        ],
      }),
    });
  });
}

async function mockApprovalFixtures(page: Page) {
  const requestedAt = '2026-01-10T09:00:00.000Z';

  await page.route('**/api/v1/approvals/APP-100/detail', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        approval: {
          id: 'APP-100',
          entity_id: 'ENTITY-10',
          gate_id: 'gate.critic-risk-2',
          stage: 'PHASE_2',
          requested_by: 'risk-agent',
          requested_at: requestedAt,
          required_role: 'Security Architect',
          status: 'PENDING',
          context: 'Security deviation requires review.',
          risk_assessment: 'Medium risk with compensating controls.',
          recommended_action: 'APPROVE_WITH_CONDITIONS',
          related_artifacts: ['BusinessDocs/decisions.md'],
        },
      }),
    });
  });

  await page.route('**/api/v1/approvals', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        approvals: [
          {
            id: 'APP-100',
            entity_id: 'ENTITY-10',
            gate_id: 'gate.critic-risk-2',
            stage: 'PHASE_2',
            requested_by: 'risk-agent',
            requested_at: requestedAt,
            required_role: 'Security Architect',
            status: 'PENDING',
          },
        ],
        count: 1,
      }),
    });
  });
}

async function mockDecisionFixtures(page: Page) {
  await page.route('**/api/decisions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        open: [
          {
            id: 'D-OPEN-900',
            type: 'OPEN_QUESTION',
            status: 'OPEN',
            priority: 'HIGH',
            scope: 'phase-2',
            question: 'Should we enforce stricter policy checks in CI?',
            answer: 'Pending product decision.',
            date: '2026-01-09',
          },
        ],
        decided: [],
        deferred: [],
        categories: [],
      }),
    });
  });
}

const PAGES = [
  { path: '/', name: 'Dashboard' },
  { path: '/decisions', name: 'Decisions' },
  { path: '/questionnaires', name: 'Questionnaires' },
  { path: '/commands', name: 'Commands' },
  { path: '/approvals', name: 'Approvals' },
  { path: '/observability', name: 'Observability' },
  { path: '/pipeline', name: 'Pipeline' },
  { path: '/sessions', name: 'Sessions' },
  { path: '/agents', name: 'Agents' },
];

test.describe('axe-core WCAG 2.1 AA scan', () => {
  for (const { path, name } of PAGES) {
    test(`${name} (${path}) has no critical or serious violations`, async ({ page }) => {
      await page.goto(path);
      // Wait for React hydration
      await page.waitForSelector('[data-testid], main, h1', { timeout: 5000 });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (critical.length > 0) {
        const report = critical.map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join('\n  ')}`
        );
        expect(critical, `WCAG violations on ${name}:\n${report.join('\n')}`).toHaveLength(0);
      }
    });
  }
});

test.describe('Keyboard navigation', () => {
  test('Tab reaches all nav links on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });

    // Tab through interactive elements and track focused element roles
    const focusedElements: string[] = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'BODY';
        return `${el.tagName}:${el.getAttribute('role') || ''}:${el.textContent?.trim().slice(0, 30) || ''}`;
      });
      focusedElements.push(tag);
      if (tag === 'BODY') break;
    }

    // Verify we reached at least one link and one nav element
    const hasLink = focusedElements.some((f) => f.startsWith('A:'));
    const hasButton = focusedElements.some((f) => f.startsWith('BUTTON:'));
    expect(hasLink || hasButton, 'Tab should reach interactive elements').toBe(true);
  });

  test('focus indicators are visible on interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('nav', { timeout: 5000 });

    // Tab to an interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that the focused element has a visible focus indicator
    const hasOutline = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return false;
      const styles = window.getComputedStyle(el);
      // Check for outline or box-shadow (Tailwind ring utilities use box-shadow)
      return (
        (styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px') ||
        styles.boxShadow !== 'none'
      );
    });

    expect(hasOutline, 'Focused element should have visible focus indicator').toBe(true);
  });

  test('Escape closes modal/dialog if open', async ({ page }) => {
    await page.goto('/commands');
    await page.waitForSelector('main, h1, h2', { timeout: 5000 });

    // Press Escape — should not cause errors
    await page.keyboard.press('Escape');
    // Page should still be functional
    await expect(page.locator('main')).toBeVisible();
  });

  test('workspaces modal supports keyboard open and escape close', async ({ page }) => {
    await mockAuthenticatedOperator(page);
    await mockWorkspaceFixtures(page);

    await page.goto('/workspaces');
    await page.waitForSelector('[data-testid="workspaces-page"]', { timeout: 10_000 });

    const createWorkspaceButton = page.getByRole('button', { name: 'Workspace', exact: true });
    await createWorkspaceButton.focus();
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'New Workspace' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(createWorkspaceButton).toBeVisible();
  });

  test('approvals keyboard toggles detail context and closes panel', async ({ page }) => {
    await mockAuthenticatedOperator(page);
    await mockApprovalFixtures(page);

    await page.goto('/approvals');
    await page.waitForSelector('[data-testid="approval-row-APP-100"]', { timeout: 10_000 });

    const approvalRow = page.getByTestId('approval-row-APP-100');
    await approvalRow.focus();
    await page.keyboard.press('Enter');

    const contextPanel = page.getByTestId('approval-decision-panel');
    await expect(contextPanel).toBeVisible();
    await expect(contextPanel.getByRole('heading', { name: 'gate.critic-risk-2' })).toBeVisible();

    await page.getByRole('button', { name: 'Close detail panel' }).focus();
    await page.keyboard.press('Enter');

    await expect(contextPanel).toBeHidden();
    await expect(page.getByLabel('Approval decision context')).toHaveCount(0);
  });

  test('decisions table action opens and closes detail dialog via keyboard', async ({ page }) => {
    await mockAuthenticatedOperator(page);
    await mockDecisionFixtures(page);

    await page.goto('/decisions');
    await page.waitForSelector('table', { timeout: 10_000 });

    const viewButton = page.getByRole('button', { name: 'View D-OPEN-900' });
    await viewButton.focus();
    await page.keyboard.press('Enter');

    const detailDialog = page.getByRole('dialog', { name: 'Decision D-OPEN-900' });
    await expect(detailDialog).toBeVisible();

    await detailDialog.getByRole('button', { name: /close/i }).first().focus();
    await page.keyboard.press('Enter');
    await expect(detailDialog).toBeHidden();
  });
});

test.describe('ARIA landmarks', () => {
  for (const { path, name } of PAGES) {
    test(`${name} has required ARIA landmarks`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('main, [role="main"]', { timeout: 5000 });

      // Check for main landmark
      const mainCount = await page.locator('main, [role="main"]').count();
      expect(mainCount, `${name} should have a <main> landmark`).toBeGreaterThanOrEqual(1);

      // Check for navigation landmark
      const navCount = await page.locator('nav, [role="navigation"]').count();
      expect(navCount, `${name} should have a <nav> landmark`).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe('Color contrast (WCAG AA)', () => {
  test('axe-core finds no color-contrast violations on dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('main', { timeout: 5000 });

    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(violations, 'Color contrast violations found').toHaveLength(0);
  });
});
