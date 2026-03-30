import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessGuard } from '@/components/ui/access-guard';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { useAuthStore } from '@/stores/auth-store';

function renderGuard(requiredRole: 'viewer' | 'operator' | 'admin') {
  return render(
    <RouterTestWrapper initialEntries={['/administration']}>
      <AccessGuard requiredRole={requiredRole}>
        <div>Protected content</div>
      </AccessGuard>
    </RouterTestWrapper>
  );
}

describe('AccessGuard', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: false });
  });

  it('renders sign-in no-access state when no user session exists', () => {
    renderGuard('operator');

    expect(screen.getByText(/sign in required/i)).toBeInTheDocument();
    expect(
      screen.getByText(/you need an authenticated session to access this area/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument();
  });

  it('renders role-restricted no-access state when user role is insufficient', () => {
    useAuthStore.setState({
      loading: false,
      user: {
        id: 10,
        github_id: 10,
        login: 'viewer-user',
        display_name: 'Viewer User',
        avatar_url: 'https://example.com/avatar.png',
        role: 'viewer',
      },
    });

    renderGuard('admin');

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.getByText(/your role does not grant access to this view/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to overview/i })).toBeInTheDocument();
  });

  it('renders protected content when role requirement is satisfied', () => {
    useAuthStore.setState({
      loading: false,
      user: {
        id: 22,
        github_id: 22,
        login: 'admin-user',
        display_name: 'Admin User',
        avatar_url: 'https://example.com/avatar.png',
        role: 'admin',
      },
    });

    renderGuard('operator');

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText(/access restricted/i)).not.toBeInTheDocument();
  });
});
