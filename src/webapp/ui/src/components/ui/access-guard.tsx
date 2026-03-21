import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { useAuthorization, type RoleRequirement } from '@/hooks/use-auth';

interface AccessGuardProps {
  requiredRole?: RoleRequirement;
  children: React.ReactNode;
}

export function AccessGuard({ requiredRole, children }: AccessGuardProps) {
  const navigate = useNavigate();
  const { user, loading, hasRequiredRole } = useAuthorization();

  if (!requiredRole) return <>{children}</>;

  if (loading) {
    return (
      <PageShell isLoading loadingLabel="Checking access...">
        {null}
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell
        isNoAccess
        noAccessState={{
          icon: <ShieldOff className="size-8" />,
          title: 'Sign in required',
          description: 'You need an authenticated session to access this area.',
          action: { label: 'Go to login', onClick: () => navigate('/login') },
        }}
      >
        {null}
      </PageShell>
    );
  }

  if (!hasRequiredRole(requiredRole)) {
    return (
      <PageShell
        isNoAccess
        noAccessState={{
          icon: <ShieldOff className="size-8" />,
          title: 'Access restricted',
          description: 'Your role does not grant access to this view.',
          action: { label: 'Return to overview', onClick: () => navigate('/') },
        }}
      >
        {null}
      </PageShell>
    );
  }

  return <>{children}</>;
}
