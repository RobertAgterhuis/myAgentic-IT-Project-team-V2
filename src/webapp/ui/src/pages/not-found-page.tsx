/**
 * Not Found page — shown for unmatched routes.
 */
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <EmptyState
        icon={<FileQuestion className="size-12" />}
        title="Page not found"
        description="The page you are looking for doesn't exist or has been moved."
        action={{ label: 'Go to Dashboard', onClick: () => navigate('/') }}
      />
    </div>
  );
}
