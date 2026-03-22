import { useCallback } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRemoveRepository } from '@/hooks';
import type { WorkspaceRepository } from '@/lib/api-types';

export function RemoveRepositoryDialog({
  repository,
  workspaceId,
  onClose,
}: {
  repository: WorkspaceRepository | null;
  workspaceId: string;
  onClose: () => void;
}) {
  const removeRepository = useRemoveRepository();

  const handleConfirm = useCallback(() => {
    if (!repository) return;
    removeRepository.mutate(
      { workspaceId, repositoryId: repository.id },
      { onSuccess: () => onClose() }
    );
  }, [removeRepository, repository, workspaceId, onClose]);

  if (!repository) return null;

  return (
    <ConfirmDialog
      open={!!repository}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Remove repository?"
      message={`Are you sure you want to remove "${repository.name}" from this workspace?`}
      confirmLabel="Yes, remove"
      cancelLabel="No, cancel"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
