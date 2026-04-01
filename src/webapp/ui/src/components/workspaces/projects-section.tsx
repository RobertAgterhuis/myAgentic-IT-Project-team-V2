import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateProjectDialog } from './create-project-dialog';
import { DeleteProjectDialog } from './delete-project-dialog';
import { Trash2, Plus, Layers } from 'lucide-react';
import type { WorkspaceProject } from '@/lib/api-types';

export function ProjectsSection({
  workspaceId,
  projects,
}: {
  workspaceId: string;
  projects: WorkspaceProject[];
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<WorkspaceProject | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Layers className="size-4" />
          Projects ({projects.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-1.5 size-3" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card elevation="flat" className="p-4 text-center text-sm text-muted-foreground">
          No projects created yet
        </Card>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              elevation="flat"
              className="flex items-center justify-between p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{project.name}</span>
                  <Badge className={getStatusColor(project.status)} variant="outline">
                    {project.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {project.repositories.length} repositories
                </div>
                {project.sessions.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {project.sessions.length} sessions
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setSelectedForDeletion(project)}
                aria-label={`Delete ${project.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        workspaceId={workspaceId}
      />

      <DeleteProjectDialog
        project={selectedForDeletion}
        workspaceId={workspaceId}
        onClose={() => setSelectedForDeletion(null)}
      />
    </div>
  );
}
