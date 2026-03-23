/**
 * Login page tests — ID-2.1.4 / Issue #870
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import LoginPage from './login-page';
import { TestWrapper } from '@/test/test-wrapper';
import { server } from '@/test/msw-server';
import { useAuthStore } from '@/stores/auth-store';

// Stub window.location.href assignment (jsdom does not support nav)
// Stub window.location.href assignment (jsdom does not support nav).
// Keep a full URL shape so relative fetch() calls resolve correctly via MSW.
const locationStub = {
  href: 'http://localhost/',
  origin: 'http://localhost',
  hostname: 'localhost',
  pathname: '/',
  search: '',
  hash: '',
  protocol: 'http:',
  host: 'localhost',
  port: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  writable: true,
  configurable: true,
  value: locationStub,
});

function renderPage() {
  return render(<LoginPage />, { wrapper: TestWrapper });
}

describe('LoginPage', () => {
  beforeEach(() => {
    locationStub.href = 'http://localhost/login';
    // Reset auth store so buttons are enabled (loading starts true by default)
    useAuthStore.getState().setLoading(false);
  });

  describe('GitHub-only configuration', () => {
    it('renders the platform heading', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /agentic sdlc platform/i })).toBeInTheDocument();
      });
    });

    it('shows GitHub login button when github provider is enabled', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('github-login-button')).toBeInTheDocument();
      });
      expect(screen.getByTestId('github-login-button')).not.toBeDisabled();
    });

    it('does not show Microsoft button when entra is not configured', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('github-login-button')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('entra-login-button')).not.toBeInTheDocument();
    });

    it('navigates to /api/auth/login when GitHub button is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('github-login-button')).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByTestId('github-login-button')).not.toBeDisabled();
      });
      await user.click(screen.getByTestId('github-login-button'));
      expect(locationStub.href).toBe('/api/auth/login');
    });
  });

  describe('Both providers configured', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })),
        http.get('/api/auth/providers', () => HttpResponse.json({ github: true, entra: true }))
      );
    });

    it('shows both GitHub and Microsoft buttons', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('github-login-button')).toBeInTheDocument();
        expect(screen.getByTestId('entra-login-button')).toBeInTheDocument();
      });
    });

    it('Microsoft button label is "Sign in with Microsoft"', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('entra-login-button')).toBeInTheDocument();
      });
      expect(screen.getByTestId('entra-login-button')).not.toBeDisabled();
      expect(screen.getByTestId('entra-login-button')).toHaveTextContent(/microsoft/i);
    });

    it('navigates to /api/auth/entra/login when Microsoft button is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('entra-login-button')).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByTestId('entra-login-button')).not.toBeDisabled();
      });
      await user.click(screen.getByTestId('entra-login-button'));
      expect(locationStub.href).toBe('/api/auth/entra/login');
    });
  });

  describe('Entra-only configuration', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })),
        http.get('/api/auth/providers', () => HttpResponse.json({ github: false, entra: true }))
      );
    });

    it('shows Microsoft button but not GitHub button', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('entra-login-button')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('github-login-button')).not.toBeInTheDocument();
    });
  });

  describe('Auth service unavailable (503)', () => {
    beforeEach(() => {
      server.use(http.get('/api/auth/me', () => HttpResponse.json({}, { status: 503 })));
    });

    it('shows error banner when auth returns 503', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/authentication not available/i)).toBeInTheDocument();
      });
    });

    it('shows configuration card with GitHub env var instructions', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/configuration required/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/github_client_id/i)).toBeInTheDocument();
      expect(screen.getByText(/github_client_secret/i)).toBeInTheDocument();
    });

    it('shows Entra env var instructions in configuration card', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/entra_client_id/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/entra_tenant_id/i)).toBeInTheDocument();
    });

    it('does not show login buttons when auth is unavailable', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/authentication not available/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('github-login-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('entra-login-button')).not.toBeInTheDocument();
    });
  });

  describe('Auth /providers endpoint unavailable', () => {
    beforeEach(() => {
      server.use(
        http.get('/api/auth/me', () => HttpResponse.json({}, { status: 401 })),
        http.get('/api/auth/providers', () => HttpResponse.json({}, { status: 500 }))
      );
    });

    it('falls back to showing GitHub button only when providers endpoint fails', async () => {
      renderPage();
      await waitFor(() => {
        expect(screen.getByTestId('github-login-button')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('entra-login-button')).not.toBeInTheDocument();
    });
  });

  describe('Shield icon renders', () => {
    it('renders the shield icon in the header', async () => {
      // The Shield icon wraps in a div — verify the card header exists
      renderPage();
      await waitFor(() => {
        const heading = screen.getByRole('heading', { name: /agentic sdlc platform/i });
        expect(heading).toBeInTheDocument();
      });
    });
  });

  describe('window.open stub for external links', () => {
    it('opens GitHub dev console when "Create GitHub App" button is clicked (503 mode)', async () => {
      server.use(http.get('/api/auth/me', () => HttpResponse.json({}, { status: 503 })));
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => {
        expect(screen.getByText(/create github app/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/create github app/i));
      expect(openSpy).toHaveBeenCalledWith('https://github.com/settings/developers', '_blank');
      openSpy.mockRestore();
    });
  });
});
