import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { useCreateProject } from '@/hooks';

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
        <InputField
          label="Project ID"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="e.g., proj-data-pipeline"
        />
        <InputField
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name"
        />
      </div>
    </ModalDialog>
  );
}
