import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { FormRow } from '@/components/ui/form-row';
import { AsyncMutationFeedback } from '@/components/ui/async-mutation-feedback';
import { useAddRepository } from '@/hooks';

export function AddRepositoryDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}) {
  const addRepository = useAddRepository();
  const [repoId, setRepoId] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<'github' | 'azure-devops' | 'gitlab' | 'local'>(
    'github'
  );
  const [url, setUrl] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');

  const handleSubmit = useCallback(() => {
    if (!repoId.trim() || !name.trim() || !url.trim() || !defaultBranch.trim()) return;

    addRepository.mutate(
      {
        workspaceId,
        repository: {
          id: repoId.trim(),
          name: name.trim(),
          provider,
          url: url.trim(),
          defaultBranch: defaultBranch.trim(),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setRepoId('');
          setName('');
          setProvider('github');
          setUrl('');
          setDefaultBranch('main');
        },
      }
    );
  }, [addRepository, repoId, name, provider, url, defaultBranch, workspaceId, onOpenChange]);

  return (
    <ModalDialog
      title="Add Repository"
      description="Register a repository with this workspace"
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
            disabled={
              !repoId.trim() ||
              !name.trim() ||
              !url.trim() ||
              !defaultBranch.trim() ||
              addRepository.isPending
            }
            loading={addRepository.isPending}
          >
            Add repository
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <AsyncMutationFeedback
          mutation={addRepository}
          pendingMessage="Adding repository..."
          successMessage="Repository added."
          errorMessagePrefix="Adding repository failed."
          onRetry={handleSubmit}
        />
        <InputField
          label="Repository ID"
          value={repoId}
          onChange={(e) => setRepoId(e.target.value)}
          placeholder="e.g., repo-frontend"
        />
        <InputField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <FormRow label="Provider">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as typeof provider)}
          >
            <option value="github">GitHub</option>
            <option value="azure-devops">Azure DevOps</option>
            <option value="gitlab">GitLab</option>
            <option value="local">Local</option>
          </select>
        </FormRow>
        <InputField
          label="Repository URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
        />
        <InputField
          label="Default Branch"
          value={defaultBranch}
          onChange={(e) => setDefaultBranch(e.target.value)}
          placeholder="main"
        />
      </div>
    </ModalDialog>
  );
}
