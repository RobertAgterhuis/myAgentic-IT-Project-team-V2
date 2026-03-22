import { useCallback } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeleteProject } from '@/hooks';
import type { WorkspaceProject } from '@/lib/api-types';

export function DeleteProjectDialog({
  project,
  workspaceId,
  onClose,
}: {
  project: WorkspaceProject | null;
  workspaceId: string;
  onClose: () => void;
}) {
  const deleteProject = useDeleteProject();

  const handleConfirm = useCallback(() => {
    if (!project) return;
    deleteProject.mutate({ projectId: project.id, workspaceId }, { onSuccess: () => onClose() });
  }, [deleteProject, project, workspaceId, onClose]);

  if (!project) return null;

  return (
    <ConfirmDialog
      open={!!project}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Delete project?"
      message={`Are you sure you want to delete the project "${project.name}"? This action cannot be undone.`}
      confirmLabel="Yes, delete"
      cancelLabel="No, cancel"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
