import { test, expect, type Page, type Route } from '@playwright/test';

function mockAuthMe(page: Page, user: unknown | null, status = 200) {
  return page.route('**/api/auth/me', async (route: Route) => {
    if (status === 401) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'UNAUTHORIZED' }),
      });
      return;
    }

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: { user } }),
    });
  });
}

test.describe('UI security smoke', () => {
  test('blocks unauthenticated user on operator-protected route and preserves next target', async ({
    page,
  }) => {
    await mockAuthMe(page, null, 401);

    await page.goto('/decisions');

    await expect(page.getByText('Sign in required')).toBeVisible();
    await expect(
      page.getByText('You need an authenticated session to access this area.')
    ).toBeVisible();

    await page.getByRole('button', { name: 'Go to login' }).click();
    await expect(page).toHaveURL(/\/login\?reason=auth-required&next=%2Fdecisions/);
  });

  test('blocks viewer from admin-only route', async ({ page }) => {
    await mockAuthMe(page, {
      id: 10,
      github_id: 110,
      login: 'viewer-user',
      display_name: 'Viewer User',
      avatar_url: 'https://example.test/avatar.png',
      role: 'viewer',
    });

    await page.goto('/administration');

    await expect(page.getByText('Access restricted')).toBeVisible();
    await expect(page.getByText('Your role does not grant access to this view.')).toBeVisible();
  });

  test('redirects to login with reason=session-expired when auth-expired event is emitted', async ({
    page,
  }) => {
    await mockAuthMe(page, {
      id: 20,
      github_id: 120,
      login: 'operator-user',
      display_name: 'Operator User',
      avatar_url: 'https://example.test/avatar.png',
      role: 'operator',
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('agentic:auth-expired', {
          detail: {
            status: 401,
            endpoint: '/api/test',
            at: new Date().toISOString(),
          },
        })
      );
    });

    await expect(page).toHaveURL(/\/login\?reason=session-expired&next=%2Fdashboard/);
  });
});
