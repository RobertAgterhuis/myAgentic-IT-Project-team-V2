import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { AsyncMutationFeedback } from '@/components/ui/async-mutation-feedback';
import { useCreateWorkspace } from '@/hooks';

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createWorkspace = useCreateWorkspace();
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');

  const handleSubmit = useCallback(() => {
    if (!id.trim() || !name.trim() || !owner.trim()) return;
    createWorkspace.mutate(
      { id: id.trim(), name: name.trim(), owner: owner.trim() },
      {
        onSuccess: () => {
          onOpenChange(false);
          setId('');
          setName('');
          setOwner('');
        },
      }
    );
  }, [createWorkspace, id, name, owner, onOpenChange]);

  return (
    <ModalDialog
      title="New Workspace"
      description="Create a new workspace to organize repositories and projects."
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!id.trim() || !name.trim() || !owner.trim() || createWorkspace.isPending}
            loading={createWorkspace.isPending}
          >
            Create workspace
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <AsyncMutationFeedback
          mutation={createWorkspace}
          pendingMessage="Creating workspace..."
          successMessage="Workspace created."
          errorMessagePrefix="Workspace creation failed."
          onRetry={handleSubmit}
        />
        <InputField
          label="Workspace ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="e.g., ws-frontend-team"
        />
        <InputField
          label="Workspace Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Frontend Team"
        />
        <InputField
          label="Owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="e.g., john.doe@company.com"
        />
      </div>
    </ModalDialog>
  );
}
