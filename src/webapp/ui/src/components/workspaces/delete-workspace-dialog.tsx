import { useCallback } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeleteWorkspace } from '@/hooks';
import type { WorkspaceSummary } from '@/lib/api-types';

export function DeleteWorkspaceDialog({
  workspace,
  onClose,
}: {
  workspace: WorkspaceSummary | null;
  onClose: () => void;
}) {
  const deleteWorkspace = useDeleteWorkspace();

  const handleConfirm = useCallback(() => {
    if (!workspace) return;
    deleteWorkspace.mutate(workspace.id, {
      onSuccess: () => onClose(),
    });
  }, [deleteWorkspace, workspace, onClose]);

  if (!workspace) return null;

  return (
    <ConfirmDialog
      open={!!workspace}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Delete workspace?"
      message={`Are you sure you want to delete the workspace "${workspace.name}"? This action cannot be undone.`}
      confirmLabel="Yes, delete"
      cancelLabel="No, cancel"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
