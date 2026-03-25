/**
 * InteractiveLineageGraph — SVG-based DAG with zoom, pan, click, hover.
 * Uses a simple left-to-right topological layout (no external dagre dependency).
 * M27-001 / Artifact lineage graph visualization
 */
import { useMemo, useState, useRef, useCallback, type WheelEvent, type MouseEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import type { LineageNode, LineageEdge } from '@/lib/api-types';

/* ── Layout constants ── */
const NODE_W = 180;
const NODE_H = 56;
const GAP_X = 80;
const GAP_Y = 24;
const PAD = 40;

/* ── Status styles ── */
const statusFill: Record<string, string> = {
  VALID: '#22c55e',
  DRAFT: '#60a5fa',
  SUPERSEDED: '#fbbf24',
  INVALID: '#f87171',
};

const statusBadge: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  VALID: 'success',
  DRAFT: 'info',
  SUPERSEDED: 'warning',
  INVALID: 'error',
};

const edgeColor: Record<string, string> = {
  PRODUCES: '#22c55e',
  CONSUMES: '#60a5fa',
  SUPERSEDES: '#fbbf24',
};

/* ── Simple topological layer assignment ── */
function assignLayers(
  nodes: LineageNode[],
  edges: LineageEdge[]
): Map<string, { col: number; row: number }> {
  const positions = new Map<string, { col: number; row: number }>();
  const children = new Map<string, string[]>();
  const inDeg = new Map<string, number>();

  for (const n of nodes) {
    children.set(n.id, []);
    inDeg.set(n.id, 0);
  }
  for (const e of edges) {
    children.get(e.source)?.push(e.target);
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
  }

  // BFS layer assignment
  const queue: string[] = [];
  for (const [id, deg] of inDeg) {
    if (deg === 0) queue.push(id);
  }

  const layers: string[][] = [];
  const visited = new Set<string>();

  while (queue.length) {
    const layer: string[] = [];
    const nextQueue: string[] = [];
    for (const id of queue) {
      if (visited.has(id)) continue;
      visited.add(id);
      layer.push(id);
      for (const child of children.get(id) ?? []) {
        const newDeg = (inDeg.get(child) ?? 1) - 1;
        inDeg.set(child, newDeg);
        if (newDeg <= 0) nextQueue.push(child);
      }
    }
    if (layer.length) layers.push(layer);
    queue.length = 0;
    queue.push(...nextQueue);
  }

  // Assign remaining disconnected nodes
  for (const n of nodes) {
    if (!visited.has(n.id)) {
      layers.push([n.id]);
      visited.add(n.id);
    }
  }

  for (let col = 0; col < layers.length; col++) {
    for (let row = 0; row < layers[col].length; row++) {
      positions.set(layers[col][row], { col, row });
    }
  }

  return positions;
}

interface InteractiveLineageGraphProps {
  nodes: LineageNode[];
  edges: LineageEdge[];
  selectedNodeId?: string;
  onNodeClick?: (id: string) => void;
  className?: string;
}

export function InteractiveLineageGraph({
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
  className,
}: InteractiveLineageGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  const positions = useMemo(() => assignLayers(nodes, edges), [nodes, edges]);

  const nodeById = useMemo(() => {
    const map = new Map<string, LineageNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const maxCol = useMemo(
    () => Math.max(0, ...Array.from(positions.values()).map((p) => p.col)),
    [positions]
  );
  const maxRow = useMemo(
    () => Math.max(0, ...Array.from(positions.values()).map((p) => p.row)),
    [positions]
  );

  const svgW = (maxCol + 1) * (NODE_W + GAP_X) + PAD * 2;
  const svgH = (maxRow + 1) * (NODE_H + GAP_Y) + PAD * 2;

  const getX = useCallback((col: number) => PAD + col * (NODE_W + GAP_X), []);
  const getY = useCallback((row: number) => PAD + row * (NODE_H + GAP_Y), []);

  const handleWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.2, Math.min(3, prev.scale * delta)),
    }));
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    },
    [transform.x, transform.y]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      }));
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleNodeActivate = useCallback(
    (id: string) => {
      onNodeClick?.(id);
    },
    [onNodeClick]
  );

  return (
    <div
      className={`overflow-hidden rounded-lg border bg-card ${className ?? ''}`}
      role="group"
      aria-label="Artifact lineage graph"
    >
      <svg
        ref={svgRef}
        width="100%"
        height={Math.max(400, svgH * transform.scale)}
        viewBox={`0 0 ${svgW} ${svgH}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-grab active:cursor-grabbing"
      >
        <title>Artifact lineage graph</title>
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          {edges.map((edge, i) => {
            const src = positions.get(edge.source);
            const tgt = positions.get(edge.target);
            if (!src || !tgt) return null;
            const x1 = getX(src.col) + NODE_W;
            const y1 = getY(src.row) + NODE_H / 2;
            const x2 = getX(tgt.col);
            const y2 = getY(tgt.row) + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;
            return (
              <g key={`edge-${i}`}>
                <path
                  d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={edgeColor[edge.relationship] ?? '#94a3b8'}
                  strokeWidth={isHighlighted ? 3 : 1.5}
                  strokeDasharray={edge.relationship === 'SUPERSEDES' ? '6,4' : undefined}
                  opacity={isHighlighted ? 1 : 0.6}
                  markerEnd="url(#arrowhead)"
                />
                <text
                  x={mx}
                  y={(y1 + y2) / 2 - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {edge.relationship}
                </text>
              </g>
            );
          })}

          {/* Arrowhead marker */}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const x = getX(pos.col);
            const y = getY(pos.row);
            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNode;

            return (
              <g
                key={node.id}
                transform={`translate(${x},${y})`}
                onClick={() => handleNodeActivate(node.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleNodeActivate(node.id);
                  }
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Artifact: ${node.id}, Status: ${node.status}`}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill={
                    isSelected || isHovered
                      ? 'var(--color-primary-50, #eff6ff)'
                      : 'var(--color-card, #fff)'
                  }
                  stroke={
                    isSelected ? 'var(--color-primary, #3b82f6)' : 'var(--color-border, #e2e8f0)'
                  }
                  strokeWidth={isSelected ? 2.5 : 1}
                />
                {/* Status dot */}
                <circle cx={14} cy={NODE_H / 2} r={5} fill={statusFill[node.status] ?? '#94a3b8'} />
                {/* Label */}
                <text
                  x={28}
                  y={22}
                  className="fill-foreground text-[11px] font-mono"
                  clipPath={`inset(0 ${NODE_W - 30}px 0 0)`}
                >
                  {node.id.length > 20 ? `${node.id.slice(0, 18)}…` : node.id}
                </text>
                <text x={28} y={40} className="fill-muted-foreground text-[9px]">
                  {node.artifact_type} · {node.status}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-2 left-2 rounded-md border bg-popover p-2 shadow-md text-xs z-10">
          <p className="font-mono font-semibold">{hoveredNode}</p>
          {nodeById.get(hoveredNode) && (
            <div className="flex gap-1 mt-1">
              <Badge
                variant={statusBadge[nodeById.get(hoveredNode)!.status] ?? 'secondary'}
                className="text-[10px]"
              >
                {nodeById.get(hoveredNode)!.status}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {nodeById.get(hoveredNode)!.artifact_type}
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
