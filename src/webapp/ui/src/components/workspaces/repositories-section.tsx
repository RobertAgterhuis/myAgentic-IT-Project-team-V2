import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddRepositoryDialog } from './add-repository-dialog';
import { RemoveRepositoryDialog } from './remove-repository-dialog';
import { Trash2, Plus, GitFork } from 'lucide-react';
import type { WorkspaceRepository } from '@/lib/api-types';

export function RepositoriesSection({
  workspaceId,
  repositories,
}: {
  workspaceId: string;
  repositories: WorkspaceRepository[];
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedForRemoval, setSelectedForRemoval] = useState<WorkspaceRepository | null>(null);

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'github':
        return 'bg-gray-900 text-white';
      case 'azure-devops':
        return 'bg-blue-600 text-white';
      case 'gitlab':
        return 'bg-orange-600 text-white';
      case 'local':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <GitFork className="size-4" />
          Repositories ({repositories.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-1.5 size-3" />
          Add Repository
        </Button>
      </div>

      {repositories.length === 0 ? (
        <Card elevation="flat" className="p-4 text-center text-sm text-muted-foreground">
          No repositories added yet
        </Card>
      ) : (
        <div className="space-y-2">
          {repositories.map((repo) => (
            <Card key={repo.id} elevation="flat" className="flex items-center justify-between p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{repo.name}</span>
                  <Badge className={`${getProviderColor(repo.provider)} text-xs`}>
                    {repo.provider}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{repo.url}</div>
                {repo.defaultBranch && (
                  <div className="text-xs text-muted-foreground">
                    Default branch: <span className="font-mono">{repo.defaultBranch}</span>
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setSelectedForRemoval(repo)}
              >
                <Trash2 className="size-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      <AddRepositoryDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        workspaceId={workspaceId}
      />

      <RemoveRepositoryDialog
        repository={selectedForRemoval}
        workspaceId={workspaceId}
        onClose={() => setSelectedForRemoval(null)}
      />
    </div>
  );
}
