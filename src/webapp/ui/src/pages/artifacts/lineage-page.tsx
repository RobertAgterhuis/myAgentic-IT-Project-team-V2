/**
 * Lineage visualization page — renders artifact lineage as a visual DAG.
 * M10 / Issue #393
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { DagNode } from '@/components/artifacts/dag-node';
import { DagEdge } from '@/components/artifacts/dag-edge';
import { InteractiveLineageGraph } from '@/components/cockpit/interactive-lineage-graph';
import { useArtifacts, useArtifactLineage } from '@/hooks';
import { GitBranch, Circle, Search, RefreshCw, Network } from 'lucide-react';

/* ── Main Page ── */
export default function LineagePage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('artifact') ?? '';
  const [selectedId, setSelectedId] = useState(initialId);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('graph');

  const {
    data: artifactData,
    isLoading: artifactsLoading,
    error: artifactsError,
    refetch: refetchArtifacts,
  } = useArtifacts();
  const { data: lineageData, isLoading: lineageLoading } = useArtifactLineage(selectedId);

  const artifacts = useMemo(() => artifactData?.artifacts ?? [], [artifactData]);

  // Filter artifact list for selector
  const filteredArtifacts = useMemo(() => {
    if (!search) return artifacts;
    const lower = search.toLowerCase();
    return artifacts.filter(
      (a) => a.id.toLowerCase().includes(lower) || a.artifact_type.toLowerCase().includes(lower)
    );
  }, [artifacts, search]);

  const lineage = lineageData?.lineage;
  const nodes = lineage?.nodes ?? [];
  const edges = lineage?.edges ?? [];

  if (artifactsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading artifacts…" />
      </div>
    );
  }

  if (artifactsError) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load artifacts: {(artifactsError as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetchArtifacts()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="lineage-page">
      {/* Header */}
      <div>
        <Heading level={1}>
          <GitBranch className="size-5 inline mr-2" />
          Lineage Visualization
        </Heading>
        <Text muted>
          Visual directed acyclic graph of PRODUCES / CONSUMES / SUPERSEDES relationships
        </Text>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Artifact selector */}
        <Card elevation="flat" className="p-4 lg:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Search className="size-4 text-muted-foreground" />
              <Input
                placeholder="Search artifacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
                aria-label="Search artifacts"
              />
            </div>
            <div className="space-y-1 max-h-125 overflow-y-auto">
              {filteredArtifacts.length === 0 ? (
                <Text muted className="text-sm p-2">
                  No artifacts found.
                </Text>
              ) : (
                filteredArtifacts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedId === a.id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="font-mono text-xs truncate block">{a.id}</span>
                    <span className="text-[10px] text-muted-foreground">{a.artifact_type}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>

        {/* DAG visualization */}
        <Card elevation="flat" className="p-4 lg:col-span-2">
          {!selectedId ? (
            <EmptyState
              icon={<GitBranch className="size-12" />}
              title="Select an artifact"
              description="Choose an artifact from the list to view its lineage graph."
            />
          ) : lineageLoading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner label="Loading lineage…" />
            </div>
          ) : nodes.length === 0 ? (
            <EmptyState
              icon={<Circle className="size-12" />}
              title="No lineage data"
              description="This artifact has no recorded lineage relationships."
            />
          ) : (
            <div className="space-y-4">
              {/* View toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('graph')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    viewMode === 'graph'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Network className="size-3" /> Graph
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    viewMode === 'list'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  List
                </button>
              </div>

              {viewMode === 'graph' ? (
                <InteractiveLineageGraph
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={(nodeId) => setSelectedId(nodeId)}
                  className="h-[500px]"
                />
              ) : (
                <>
                  {/* Graph nodes */}
                  <div>
                    <Text className="text-sm font-semibold mb-2">Nodes ({nodes.length})</Text>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {nodes.map((node) => (
                        <DagNode
                          key={node.id}
                          node={node}
                          selected={node.id === selectedId}
                          onClick={() => setSelectedId(node.id)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Graph edges */}
                  {edges.length > 0 && (
                    <div>
                      <Text className="text-sm font-semibold mb-2">Edges ({edges.length})</Text>
                      <Card elevation="flat" className="divide-y">
                        {edges.map((edge, i) => (
                          <DagEdge key={`${edge.source}-${edge.target}-${i}`} edge={edge} />
                        ))}
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
