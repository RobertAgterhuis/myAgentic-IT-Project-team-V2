import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { AsyncMutationFeedback } from '@/components/ui/async-mutation-feedback';
import { useCreateProject } from '@/hooks';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}) {
  const createProject = useCreateProject();
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [idTouched, setIdTouched] = useState(false);

  useEffect(() => {
    if (!idTouched) {
      setProjectId(slugify(name));
    }
  }, [name, idTouched]);

  const handleSubmit = useCallback(() => {
    if (!projectId.trim() || !name.trim()) return;

    createProject.mutate(
      {
        workspaceId,
        project: {
          id: projectId.trim(),
          name: name.trim(),
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setProjectId('');
          setName('');
          setIdTouched(false);
        },
      }
    );
  }, [createProject, projectId, name, workspaceId, onOpenChange]);

  return (
    <ModalDialog
      title="New Project"
      description="Create a new project in this workspace"
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
            disabled={!projectId.trim() || !name.trim() || createProject.isPending}
            loading={createProject.isPending}
          >
            Create project
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <AsyncMutationFeedback
          mutation={createProject}
          pendingMessage="Creating project..."
          successMessage="Project created."
          errorMessagePrefix="Project creation failed."
          onRetry={handleSubmit}
        />
        <InputField
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Data Pipeline"
          helperText="Give the project a recognizable name used in the UI and reports."
        />
        <InputField
          label="Project ID"
          value={projectId}
          onChange={(e) => {
            setIdTouched(true);
            setProjectId(e.target.value);
          }}
          placeholder="e.g., my-data-pipeline"
          helperText="Machine-readable identifier auto-generated from the name. Edit only if you need a specific slug."
        />
      </div>
    </ModalDialog>
  );
}
