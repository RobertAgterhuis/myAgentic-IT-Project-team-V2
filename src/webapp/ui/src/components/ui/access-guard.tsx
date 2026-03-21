import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Checking access..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ShieldOff className="size-8" />}
          title="Sign in required"
          description="You need an authenticated session to access this area."
          action={{ label: 'Go to login', onClick: () => navigate('/login') }}
        />
      </div>
    );
  }

  if (!hasRequiredRole(requiredRole)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ShieldOff className="size-8" />}
          title="Access restricted"
          description="Your role does not grant access to this view."
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => navigate('/')}>
            Return to overview
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
