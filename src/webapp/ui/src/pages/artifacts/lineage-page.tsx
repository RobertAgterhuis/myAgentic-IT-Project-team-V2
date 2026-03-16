/**
 * Lineage visualization page — renders artifact lineage as a visual DAG.
 * M10 / Issue #393
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useArtifacts, useArtifactLineage } from '@/hooks';
import type { LineageNode, LineageEdge } from '@/lib/api-types';
import { GitBranch, ArrowRight, Circle, Search } from 'lucide-react';

/* ── Status color mapping ── */
const statusColor: Record<string, string> = {
  VALID: 'bg-green-500',
  DRAFT: 'bg-blue-400',
  SUPERSEDED: 'bg-amber-400',
  INVALID: 'bg-red-400',
};

const statusBadge: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  VALID: 'success',
  DRAFT: 'info',
  SUPERSEDED: 'warning',
  INVALID: 'error',
};

/* ── DAG Node component ── */
function DagNode({
  node,
  selected,
  onClick,
}: {
  node: LineageNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all hover:shadow-md ${
        selected
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <span
        className={`size-3 rounded-full ${statusColor[node.status] ?? 'bg-gray-400'}`}
        aria-label={`Status: ${node.status}`}
      />
      <div className="min-w-0">
        <p className="font-mono text-xs truncate max-w-45">{node.id}</p>
        <div className="flex items-center gap-1 mt-1">
          <Badge variant={statusBadge[node.status] ?? 'secondary'} className="text-[10px]">
            {node.status}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {node.artifact_type}
          </Badge>
        </div>
      </div>
    </button>
  );
}

/* ── DAG Edge component ── */
function DagEdge({ edge }: { edge: LineageEdge }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
      <span className="font-mono truncate max-w-30">{edge.source}</span>
      <ArrowRight className="size-3 shrink-0" />
      <span className="font-mono truncate max-w-30">{edge.target}</span>
      <Badge variant="secondary" className="text-[10px] ml-auto">
        {edge.relationship}
      </Badge>
    </div>
  );
}

/* ── Main Page ── */
export default function LineagePage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('artifact') ?? '';
  const [selectedId, setSelectedId] = useState(initialId);
  const [search, setSearch] = useState('');

  const { data: artifactData, isLoading: artifactsLoading } = useArtifacts();
  const { data: lineageData, isLoading: lineageLoading } = useArtifactLineage(selectedId);

  const artifacts = artifactData?.artifacts ?? [];

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
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
