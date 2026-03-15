// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Traceability Engine
 *
 * Provides full-chain traceability across SDLC entities:
 *   Requirement → Architecture Decision → Implementation Task → Test → Release → Deployment
 *
 * The traceability graph is a directed acyclic graph (DAG) supporting:
 * - Forward trace: "What was built to satisfy this requirement?"
 * - Backward trace: "What requirement drove this test?"
 * - Impact analysis: "If this requirement changes, what is affected?"
 * - Coverage gaps: "Which requirements have no tests?"
 *
 * Zero external dependencies. Pure functions + data structures.
 *
 * @module sdlc/traceability
 */

import type { EntityType, LinkType, SdlcEntity } from './entities.js';
import { ENTITY_TYPES } from './entities.js';

// ─── Trace Node ──────────────────────────────────────────────

export interface TraceNode {
  entity_id: string;
  entity_type: EntityType;
  name: string;
  stage: string;
}

// ─── Trace Edge ──────────────────────────────────────────────

export interface TraceEdge {
  from_id: string;
  to_id: string;
  link_type: LinkType;
  created_at: string;
}

// ─── Coverage Report ─────────────────────────────────────────

export interface CoverageReport {
  total_requirements: number;
  implemented: number;
  tested: number;
  released: number;
  gaps: CoverageGap[];
  coverage_pct: number;
}

export interface CoverageGap {
  entity_id: string;
  entity_name: string;
  missing: ('IMPLEMENTATION' | 'TEST' | 'RELEASE')[];
}

// ─── Impact Analysis ─────────────────────────────────────────

export interface ImpactReport {
  source_id: string;
  affected: ImpactedEntity[];
  total_affected: number;
}

export interface ImpactedEntity {
  entity_id: string;
  entity_type: EntityType;
  name: string;
  distance: number;
  path: string[];
}

// ─── Traceability Matrix ─────────────────────────────────────

export class TraceabilityMatrix {
  private _nodes = new Map<string, TraceNode>();
  private _edges: TraceEdge[] = [];
  private _outgoing = new Map<string, TraceEdge[]>();
  private _incoming = new Map<string, TraceEdge[]>();

  // ─── Registration ─────────────────────────────────────────

  addNode(entity: SdlcEntity | TraceNode): void {
    const node: TraceNode =
      'stage' in entity && 'links' in entity
        ? {
            entity_id: (entity as SdlcEntity).id,
            entity_type: (entity as SdlcEntity).type,
            name: (entity as SdlcEntity).name,
            stage: (entity as SdlcEntity).stage,
          }
        : (entity as TraceNode);
    this._nodes.set(node.entity_id, node);
  }

  addEdge(fromId: string, toId: string, linkType: LinkType): TraceEdge {
    const edge: TraceEdge = {
      from_id: fromId,
      to_id: toId,
      link_type: linkType,
      created_at: new Date().toISOString(),
    };
    this._edges.push(edge);

    const out = this._outgoing.get(fromId) || [];
    out.push(edge);
    this._outgoing.set(fromId, out);

    const inc = this._incoming.get(toId) || [];
    inc.push(edge);
    this._incoming.set(toId, inc);

    return edge;
  }

  addEntityWithLinks(entity: SdlcEntity): void {
    this.addNode(entity);
    for (const link of entity.links) {
      this.addEdge(entity.id, link.target_id, link.type);
    }
  }

  // ─── Forward Trace ────────────────────────────────────────

  traceForward(entityId: string, maxDepth = 10): TraceNode[] {
    const visited = new Set<string>();
    const result: TraceNode[] = [];
    const queue: { id: string; depth: number }[] = [{ id: entityId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const node = this._nodes.get(id);
      if (node && id !== entityId) result.push(node);

      const outEdges = this._outgoing.get(id) || [];
      for (const edge of outEdges) {
        if (!visited.has(edge.to_id)) {
          queue.push({ id: edge.to_id, depth: depth + 1 });
        }
      }
    }
    return result;
  }

  // ─── Backward Trace ───────────────────────────────────────

  traceBackward(entityId: string, maxDepth = 10): TraceNode[] {
    const visited = new Set<string>();
    const result: TraceNode[] = [];
    const queue: { id: string; depth: number }[] = [{ id: entityId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.add(id);

      const node = this._nodes.get(id);
      if (node && id !== entityId) result.push(node);

      const inEdges = this._incoming.get(id) || [];
      for (const edge of inEdges) {
        if (!visited.has(edge.from_id)) {
          queue.push({ id: edge.from_id, depth: depth + 1 });
        }
      }
    }
    return result;
  }

  // ─── Impact Analysis ──────────────────────────────────────

  analyzeImpact(entityId: string, maxDepth = 10): ImpactReport {
    const visited = new Map<string, { depth: number; path: string[] }>();
    const queue: { id: string; depth: number; path: string[] }[] = [
      { id: entityId, depth: 0, path: [entityId] },
    ];

    while (queue.length > 0) {
      const { id, depth, path } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;
      visited.set(id, { depth, path });

      const outEdges = this._outgoing.get(id) || [];
      for (const edge of outEdges) {
        if (!visited.has(edge.to_id)) {
          queue.push({ id: edge.to_id, depth: depth + 1, path: [...path, edge.to_id] });
        }
      }
    }

    // Remove source node from results
    visited.delete(entityId);

    const affected: ImpactedEntity[] = [];
    for (const [id, info] of visited.entries()) {
      const node = this._nodes.get(id);
      if (node) {
        affected.push({
          entity_id: id,
          entity_type: node.entity_type,
          name: node.name,
          distance: info.depth,
          path: info.path,
        });
      }
    }

    return {
      source_id: entityId,
      affected: affected.sort((a, b) => a.distance - b.distance),
      total_affected: affected.length,
    };
  }

  // ─── Coverage Analysis ─────────────────────────────────────

  analyzeCoverage(): CoverageReport {
    const requirements = Array.from(this._nodes.values()).filter(
      (n) => n.entity_type === ENTITY_TYPES.REQUIREMENT
    );

    const gaps: CoverageGap[] = [];
    let implemented = 0;
    let tested = 0;
    let released = 0;

    for (const req of requirements) {
      const downstream = this.traceForward(req.entity_id);
      const types = new Set(downstream.map((n) => n.entity_type));
      const missing: CoverageGap['missing'] = [];

      if (types.has(ENTITY_TYPES.IMPLEMENTATION_TASK)) {
        implemented++;
      } else {
        missing.push('IMPLEMENTATION');
      }

      if (types.has(ENTITY_TYPES.TEST_ARTIFACT)) {
        tested++;
      } else {
        missing.push('TEST');
      }

      if (types.has(ENTITY_TYPES.RELEASE)) {
        released++;
      } else {
        missing.push('RELEASE');
      }

      if (missing.length > 0) {
        gaps.push({ entity_id: req.entity_id, entity_name: req.name, missing });
      }
    }

    return {
      total_requirements: requirements.length,
      implemented,
      tested,
      released,
      gaps,
      coverage_pct:
        requirements.length > 0 ? Math.round((tested / requirements.length) * 100) : 100,
    };
  }

  // ─── Orphan Detection ─────────────────────────────────────

  findOrphans(): TraceNode[] {
    return Array.from(this._nodes.values()).filter((node) => {
      const hasOutgoing = (this._outgoing.get(node.entity_id)?.length || 0) > 0;
      const hasIncoming = (this._incoming.get(node.entity_id)?.length || 0) > 0;
      return !hasOutgoing && !hasIncoming;
    });
  }

  // ─── Query Helpers ─────────────────────────────────────────

  getNode(id: string): TraceNode | undefined {
    return this._nodes.get(id);
  }

  getAllNodes(): TraceNode[] {
    return Array.from(this._nodes.values());
  }

  getEdges(fromId?: string, toId?: string): TraceEdge[] {
    if (fromId && toId) {
      return this._edges.filter((e) => e.from_id === fromId && e.to_id === toId);
    }
    if (fromId) return this._outgoing.get(fromId) || [];
    if (toId) return this._incoming.get(toId) || [];
    return [...this._edges];
  }

  nodeCount(): number {
    return this._nodes.size;
  }

  edgeCount(): number {
    return this._edges.length;
  }

  // ─── Serialization ────────────────────────────────────────

  toJSON(): { nodes: TraceNode[]; edges: TraceEdge[] } {
    return {
      nodes: Array.from(this._nodes.values()),
      edges: [...this._edges],
    };
  }

  static fromJSON(data: { nodes: TraceNode[]; edges: TraceEdge[] }): TraceabilityMatrix {
    const matrix = new TraceabilityMatrix();
    for (const node of data.nodes) {
      matrix.addNode(node);
    }
    for (const edge of data.edges) {
      matrix.addEdge(edge.from_id, edge.to_id, edge.link_type);
    }
    return matrix;
  }
}
