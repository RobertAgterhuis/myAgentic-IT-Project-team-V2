import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import {
  CreateWorkspaceDialog,
  EditWorkspaceDialog,
  DeleteWorkspaceDialog,
  RepositoriesSection,
  ProjectsSection,
} from '@/components/workspaces';
import { useWorkspaceDetail, useWorkspaces } from '@/hooks';
import { FolderKanban, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react';

export default function WorkspacesPage() {
  const { data, isLoading, error, refetch } = useWorkspaces();
  const workspaces = useMemo(() => data?.workspaces ?? [], [data?.workspaces]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [workspaceToEdit, setWorkspaceToEdit] = useState<typeof selectedWorkspaceId>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<typeof selectedWorkspaceId>(null);

  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [selectedWorkspaceId, workspaces]);

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0] ?? null;

  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useWorkspaceDetail(selectedWorkspace?.id ?? null);

  const contextItems = useMemo<ContextStripItem[]>(() => {
    const repositoryCount = workspaces.reduce(
      (sum, workspace) => sum + workspace.repositories.length,
      0
    );

    return [
      {
        id: 'workspaces-count',
        label: 'Workspaces',
        value: String(workspaces.length),
        tone: workspaces.length > 0 ? 'info' : 'neutral',
      },
      {
        id: 'workspaces-repositories',
        label: 'Repositories',
        value: String(repositoryCount),
        tone: repositoryCount > 0 ? 'success' : 'neutral',
      },
      {
        id: 'workspaces-projects',
        label: 'Projects',
        value: String(detail?.projects.length ?? 0),
        tone: (detail?.projects.length ?? 0) > 0 ? 'info' : 'neutral',
      },
      {
        id: 'workspaces-selected',
        label: 'Selected',
        value: selectedWorkspace?.name ?? 'None',
        tone: selectedWorkspace ? 'success' : 'neutral',
      },
    ];
  }, [detail?.projects.length, selectedWorkspace, workspaces]);

  return (
    <>
      <PageShell
        isLoading={isLoading}
        loadingLabel="Loading workspaces..."
        error={error as Error | null}
        onRetry={() => refetch()}
        isEmpty={workspaces.length === 0}
        emptyState={{
          icon: <FolderKanban className="size-8" />,
          title: 'No workspaces found',
          description: 'Create a workspace to start grouping repositories and projects.',
          action: {
            label: 'Create workspace',
            onClick: () => setShowCreateDialog(true),
          },
        }}
      >
        <div className="space-y-6 p-6" data-testid="workspaces-page">
          <PageHeader
            title="Workspaces"
            subtitle="Manage workspace-level context, repositories, and projects for orchestration runs."
            chips={[
              {
                id: 'workspaces-chip-total',
                label: `${workspaces.length} total`,
                tone: workspaces.length > 0 ? 'info' : 'default',
              },
              {
                id: 'workspaces-chip-selection',
                label: selectedWorkspace?.id ?? 'No selection',
                tone: selectedWorkspace ? 'success' : 'default',
              },
            ]}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="mr-1.5 size-3" />
                  Refresh
                </Button>
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-1.5 size-3" />
                  Workspace
                </Button>
              </div>
            }
          />

          <ContextStrip items={contextItems} />

          <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
            <Card elevation="flat" className="space-y-2 p-3">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => setSelectedWorkspaceId(workspace.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    workspace.id === selectedWorkspace?.id
                      ? 'border-info/40 bg-info/10'
                      : 'border-border/70 bg-background hover:bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{workspace.owner}</p>
                    </div>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {workspace.repositories.length} repos
                    </Badge>
                  </div>
                </button>
              ))}
            </Card>

            <PageShell
              isLoading={detailLoading}
              loadingLabel="Loading workspace detail..."
              error={detailError as Error | null}
              onRetry={() => refetchDetail()}
              isEmpty={!detail || !detail.workspace}
              emptyState={{
                icon: <FolderKanban className="size-8" />,
                title: 'Select a workspace',
                description:
                  'Choose a workspace from the left panel to view and manage its details.',
              }}
            >
              {detail && selectedWorkspace && (
                <div className="space-y-4">
                  <Card elevation="flat" className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold">{detail.workspace.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          Owned by {detail.workspace.owner}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setWorkspaceToEdit(selectedWorkspace.id)}
                          aria-label={`Edit ${detail.workspace.name}`}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setWorkspaceToDelete(selectedWorkspace.id)}
                          aria-label={`Delete ${detail.workspace.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <RepositoriesSection
                      workspaceId={selectedWorkspace.id}
                      repositories={detail.workspace.repositories}
                    />

                    <ProjectsSection
                      workspaceId={selectedWorkspace.id}
                      projects={detail.projects}
                    />
                  </div>
                </div>
              )}
            </PageShell>
          </div>
        </div>
      </PageShell>

      {/* Dialogs must stay mounted even when PageShell renders empty/error states */}
      <CreateWorkspaceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      <EditWorkspaceDialog
        workspace={
          workspaceToEdit ? (workspaces.find((w) => w.id === workspaceToEdit) ?? null) : null
        }
        onClose={() => setWorkspaceToEdit(null)}
      />

      <DeleteWorkspaceDialog
        workspace={
          workspaceToDelete ? (workspaces.find((w) => w.id === workspaceToDelete) ?? null) : null
        }
        onClose={() => {
          setWorkspaceToDelete(null);
          setSelectedWorkspaceId(null);
        }}
      />
    </>
  );
}
