import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { AsyncMutationFeedback } from '@/components/ui/async-mutation-feedback';
import { useUpdateWorkspace } from '@/hooks';
import type { WorkspaceSummary } from '@/lib/api-types';

export function EditWorkspaceDialog({
  workspace,
  onClose,
}: {
  workspace: WorkspaceSummary | null;
  onClose: () => void;
}) {
  const updateWorkspace = useUpdateWorkspace();
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');

  useMemo(() => {
    if (!workspace) return;
    setName(workspace.name);
    setOwner(workspace.owner);
  }, [workspace]);

  const handleSubmit = useCallback(() => {
    if (!workspace) return;
    if (!name.trim() || !owner.trim()) return;

    updateWorkspace.mutate(
      {
        workspaceId: workspace.id,
        updates: {
          name: name.trim(),
          owner: owner.trim(),
        },
      },
      { onSuccess: () => onClose() }
    );
  }, [updateWorkspace, workspace, name, owner, onClose]);

  if (!workspace) return null;

  return (
    <ModalDialog
      title={`Edit workspace: ${workspace.id}`}
      description="Update workspace details"
      open={!!workspace}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !owner.trim() || updateWorkspace.isPending}
            loading={updateWorkspace.isPending}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <AsyncMutationFeedback
          mutation={updateWorkspace}
          pendingMessage="Saving workspace changes..."
          successMessage="Workspace updated."
          errorMessagePrefix="Workspace update failed."
          onRetry={handleSubmit}
        />
        <InputField
          label="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workspace name"
        />
        <InputField
          label="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="Owner email or identifier"
        />
      </div>
    </ModalDialog>
  );
}
