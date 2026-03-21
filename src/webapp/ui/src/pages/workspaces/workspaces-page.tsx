import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { useWorkspaceDetail, useWorkspaces } from '@/hooks';
import { FolderKanban, GitFork, Layers, RefreshCw } from 'lucide-react';

export default function WorkspacesPage() {
  const { data, isLoading, error, refetch } = useWorkspaces();
  const workspaces = useMemo(() => data?.workspaces ?? [], [data?.workspaces]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

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
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-1.5 size-3" />
              Refresh
            </Button>
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
                  <div>
                    <p className="text-sm font-semibold">{workspace.name}</p>
                    <p className="text-xs text-muted-foreground">{workspace.owner}</p>
                  </div>
                  <Badge variant="outline">{workspace.repositories.length} repos</Badge>
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
              icon: <Layers className="size-8" />,
              title: 'Select a workspace',
              description: 'Choose a workspace from the left panel to inspect details.',
            }}
          >
            {detail && (
              <div className="space-y-4">
                <Card elevation="flat" className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">{detail.workspace.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Owned by {detail.workspace.owner}
                      </p>
                    </div>
                    <Badge variant="info">{detail.projects.length} projects</Badge>
                  </div>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <Card elevation="flat" className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <GitFork className="size-4 text-info" />
                      <h3 className="text-sm font-semibold">Repositories</h3>
                    </div>
                    {detail.workspace.repositories.length === 0 ? (
                      <EmptyState
                        title="No repositories"
                        description="This workspace has no linked repositories yet."
                      />
                    ) : (
                      <div className="space-y-2">
                        {detail.workspace.repositories.map((repo) => (
                          <div key={repo.id} className="rounded-lg border border-border/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{repo.name}</p>
                              <Badge variant="neutral">{repo.provider}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{repo.url}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card elevation="flat" className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <Layers className="size-4 text-info" />
                      <h3 className="text-sm font-semibold">Projects</h3>
                    </div>
                    {detail.projects.length === 0 ? (
                      <EmptyState
                        title="No projects"
                        description="Projects can be created from the workspace management APIs."
                      />
                    ) : (
                      <div className="space-y-2">
                        {detail.projects.map((project) => (
                          <div key={project.id} className="rounded-lg border border-border/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{project.name}</p>
                              <Badge variant={project.status === 'active' ? 'success' : 'outline'}>
                                {project.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {project.repositories.length} linked repositories
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </PageShell>
        </div>
      </div>
    </PageShell>
  );
}
