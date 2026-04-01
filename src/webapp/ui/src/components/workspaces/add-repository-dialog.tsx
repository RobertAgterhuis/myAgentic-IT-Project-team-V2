import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { FormRow } from '@/components/ui/form-row';
import { AsyncMutationFeedback } from '@/components/ui/async-mutation-feedback';
import { useAddRepository } from '@/hooks';

type Provider = 'github' | 'azure-devops' | 'gitlab' | 'local';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

const PROVIDER_CONFIG: Record<
  Provider,
  {
    locationLabel: string;
    locationPlaceholder: string;
    locationHelper: string;
    urlPattern: RegExp;
    showBranch: boolean;
  }
> = {
  github: {
    locationLabel: 'Repository URL',
    locationPlaceholder: 'https://github.com/owner/repo',
    locationHelper: 'Provide the full GitHub repository URL.',
    urlPattern: /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/,
    showBranch: true,
  },
  'azure-devops': {
    locationLabel: 'Repository URL',
    locationPlaceholder: 'https://dev.azure.com/org/project/_git/repo',
    locationHelper: 'Provide the full Azure DevOps Git repository URL.',
    urlPattern: /^https:\/\/(dev\.azure\.com|[\w.-]+\.visualstudio\.com)\//,
    showBranch: true,
  },
  gitlab: {
    locationLabel: 'Repository URL',
    locationPlaceholder: 'https://gitlab.com/owner/repo',
    locationHelper: 'Provide the full GitLab repository URL.',
    urlPattern: /^https:\/\/[\w.-]+\.\w+\/[\w.-]+\/[\w.-]+/,
    showBranch: true,
  },
  local: {
    locationLabel: 'Local Repository Path',
    locationPlaceholder: 'e.g., D:/repositories/my-project',
    locationHelper:
      'Absolute path to an existing local Git repository. The default branch will be detected automatically.',
    urlPattern: /^[A-Za-z]:[/\\]|^\//,
    showBranch: false,
  },
};

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
  const [idTouched, setIdTouched] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<Provider>('github');
  const [locationValue, setLocationValue] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');

  const config = PROVIDER_CONFIG[provider];

  useEffect(() => {
    if (!idTouched) {
      setRepoId(slugify(name));
    }
  }, [name, idTouched]);

  const locationError = useMemo(() => {
    if (!locationValue.trim()) return undefined;
    if (!config.urlPattern.test(locationValue.trim())) {
      return provider === 'local'
        ? 'Enter an absolute filesystem path (e.g. D:/repos/project).'
        : `Enter a valid ${provider === 'azure-devops' ? 'Azure DevOps' : provider.charAt(0).toUpperCase() + provider.slice(1)} repository URL.`;
    }
    return undefined;
  }, [locationValue, config.urlPattern, provider]);

  const canSubmit =
    repoId.trim() &&
    name.trim() &&
    locationValue.trim() &&
    !locationError &&
    (config.showBranch ? defaultBranch.trim() : true);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    addRepository.mutate(
      {
        workspaceId,
        repository: {
          id: repoId.trim(),
          name: name.trim(),
          provider,
          url: locationValue.trim(),
          defaultBranch: config.showBranch ? defaultBranch.trim() : 'auto',
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setRepoId('');
          setIdTouched(false);
          setName('');
          setProvider('github');
          setLocationValue('');
          setDefaultBranch('main');
        },
      }
    );
  }, [
    addRepository,
    canSubmit,
    repoId,
    name,
    provider,
    locationValue,
    defaultBranch,
    config.showBranch,
    workspaceId,
    onOpenChange,
  ]);

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
            disabled={!canSubmit || addRepository.isPending}
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
        <FormRow label="Provider">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value as Provider);
              setLocationValue('');
            }}
            aria-label="Repository provider"
          >
            <option value="github">GitHub</option>
            <option value="azure-devops">Azure DevOps</option>
            <option value="gitlab">GitLab</option>
            <option value="local">Local</option>
          </select>
        </FormRow>
        <InputField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Frontend App"
          helperText="Display name used in the workspace sidebar and reports."
        />
        <InputField
          label="Repository ID"
          value={repoId}
          onChange={(e) => {
            setIdTouched(true);
            setRepoId(e.target.value);
          }}
          placeholder="e.g., frontend-app"
          helperText="Machine-readable identifier auto-generated from the name."
        />
        <InputField
          label={config.locationLabel}
          helperText={locationError ? undefined : config.locationHelper}
          error={locationError}
          value={locationValue}
          onChange={(e) => setLocationValue(e.target.value)}
          placeholder={config.locationPlaceholder}
        />
        {config.showBranch && (
          <InputField
            label="Default Branch"
            value={defaultBranch}
            onChange={(e) => setDefaultBranch(e.target.value)}
            placeholder="main"
          />
        )}
      </div>
    </ModalDialog>
  );
}
