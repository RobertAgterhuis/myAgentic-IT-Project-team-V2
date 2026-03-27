// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Objective Graph Management Service
 *
 * Manages machine-readable strategic goals, KPIs, epics, sprint items, and gate linkages.
 *
 * Covers PATTERNS E2, Issue 1: Introduce machine-readable objective graph
 */

import type { ServiceContext } from '../../src/webapp/services/types';

/**
 * KPI definition
 */
export interface KPI {
  id: string;
  name: string;
  metricType: 'count' | 'percentage' | 'score' | 'duration' | 'ratio' | 'custom';
  targetValue: number | string;
  currentValue?: number | string | null;
  unit?: string;
  driftStatus?: 'on-track' | 'warning' | 'at-risk' | 'critical';
  lastUpdated?: string;
}

/**
 * Strategic objective
 */
export interface Objective {
  id: string;
  name: string;
  description: string;
  ownerAgent:
    | 'orchestrator'
    | 'business-analyst'
    | 'product-manager'
    | 'software-architect'
    | 'synthesis-agent';
  category?:
    | 'governance'
    | 'quality'
    | 'performance'
    | 'capability'
    | 'risk-reduction'
    | 'observability';
  status: 'not-started' | 'in-progress' | 'at-risk' | 'healthy' | 'completed' | 'paused';
  kpis: KPI[];
  linkedEpics: string[];
  linkedSprintItems: string[];
  linkedGates: string[];
  blockingDecisions: string[];
  blockerCount: number;
  healthScore?: number;
  recommendedActions: string[];
  lastHealthAssessment?: string;
}

/**
 * Epic supporting objectives
 */
export interface Epic {
  id: string;
  name: string;
  objectiveId: string;
  status: 'planned' | 'in-progress' | 'at-risk' | 'completed';
}

/**
 * The complete objective graph
 */
export interface ObjectiveGraph {
  version: string;
  generatedAt: string;
  objectives: Objective[];
  epics: Epic[];
  healthSummary?: {
    totalObjectives: number;
    healthy: number;
    atRisk: number;
    averageHealthScore: number;
  };
}

export class ObjectiveGraphService {
  private ctx: ServiceContext;
  private graphPath = 'BusinessDocs/intelligence-loop/objective-graph.json';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  private readText(filePath: string): string | null {
    if (!this.ctx.store.exists(filePath)) {
      return null;
    }
    return this.ctx.store.readFile(filePath);
  }

  private writeText(filePath: string, content: string): void {
    if (this.ctx.safeWrite) {
      this.ctx.safeWrite(filePath, content);
      return;
    }
    this.ctx.store.writeFile(filePath, content);
  }

  /**
   * Initialize an empty objective graph
   */
  async initializeGraph(): Promise<ObjectiveGraph> {
    const existing = this.readText(this.graphPath);
    if (existing) {
      return JSON.parse(existing);
    }

    const graph: ObjectiveGraph = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      objectives: [],
      epics: [],
    };

    this.writeText(this.graphPath, JSON.stringify(graph, null, 2));
    return graph;
  }

  /**
   * Get the current objective graph
   */
  async getGraph(): Promise<ObjectiveGraph> {
    const content = this.readText(this.graphPath);
    if (!content) {
      return this.initializeGraph();
    }
    return JSON.parse(content);
  }

  /**
   * Add an objective to the graph
   */
  async addObjective(objective: Objective): Promise<Objective> {
    const graph = await this.getGraph();

    // Check if already exists
    if (graph.objectives.some((obj) => obj.id === objective.id)) {
      throw new Error(`Objective already exists: ${objective.id}`);
    }

    graph.objectives.push(objective);
    graph.generatedAt = new Date().toISOString();

    this.writeText(this.graphPath, JSON.stringify(graph, null, 2));
    return objective;
  }

  /**
   * Update an objective
   */
  async updateObjective(objectiveId: string, updates: Partial<Objective>): Promise<Objective> {
    const graph = await this.getGraph();
    const objective = graph.objectives.find((obj) => obj.id === objectiveId);

    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    Object.assign(objective, updates);
    objective.lastHealthAssessment = new Date().toISOString();
    graph.generatedAt = new Date().toISOString();

    this.writeText(this.graphPath, JSON.stringify(graph, null, 2));
    return objective;
  }

  /**
   * Add an epic
   */
  async addEpic(epic: Epic): Promise<Epic> {
    const graph = await this.getGraph();

    // Verify objective exists
    if (!graph.objectives.some((obj) => obj.id === epic.objectiveId)) {
      throw new Error(`Objective not found: ${epic.objectiveId}`);
    }

    // Check if epic already exists
    if (graph.epics.some((e) => e.id === epic.id)) {
      throw new Error(`Epic already exists: ${epic.id}`);
    }

    graph.epics.push(epic);

    // Link epic to objective
    const objective = graph.objectives.find((obj) => obj.id === epic.objectiveId);
    if (objective && !objective.linkedEpics.includes(epic.id)) {
      objective.linkedEpics.push(epic.id);
    }

    graph.generatedAt = new Date().toISOString();
    this.writeText(this.graphPath, JSON.stringify(graph, null, 2));

    return epic;
  }

  /**
   * Link a sprint item to an objective
   */
  async linkSprintItem(objectiveId: string, sprintItemId: string): Promise<void> {
    const graph = await this.getGraph();
    const objective = graph.objectives.find((obj) => obj.id === objectiveId);

    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    if (!objective.linkedSprintItems.includes(sprintItemId)) {
      objective.linkedSprintItems.push(sprintItemId);
      graph.generatedAt = new Date().toISOString();
      this.writeText(this.graphPath, JSON.stringify(graph, null, 2));
    }
  }

  /**
   * Link a gate to an objective
   */
  async linkGate(objectiveId: string, gateId: string): Promise<void> {
    const graph = await this.getGraph();
    const objective = graph.objectives.find((obj) => obj.id === objectiveId);

    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    if (!objective.linkedGates.includes(gateId)) {
      objective.linkedGates.push(gateId);
      graph.generatedAt = new Date().toISOString();
      this.writeText(this.graphPath, JSON.stringify(graph, null, 2));
    }
  }

  /**
   * Update KPI values
   */
  async updateKPI(
    objectiveId: string,
    kpiId: string,
    currentValue: number | string | null,
    driftStatus?: string
  ): Promise<KPI> {
    const graph = await this.getGraph();
    const objective = graph.objectives.find((obj) => obj.id === objectiveId);

    if (!objective) {
      throw new Error(`Objective not found: ${objectiveId}`);
    }

    const kpi = objective.kpis.find((k) => k.id === kpiId);
    if (!kpi) {
      throw new Error(`KPI not found: ${kpiId}`);
    }

    kpi.currentValue = currentValue;
    if (driftStatus) {
      kpi.driftStatus = driftStatus as 'on-track' | 'warning' | 'at-risk' | 'critical';
    }
    kpi.lastUpdated = new Date().toISOString();

    graph.generatedAt = new Date().toISOString();
    this.writeText(this.graphPath, JSON.stringify(graph, null, 2));

    return kpi;
  }

  /**
   * Get all objectives with a specific status
   */
  async getObjectivesByStatus(status: Objective['status']): Promise<Objective[]> {
    const graph = await this.getGraph();
    return graph.objectives.filter((obj) => obj.status === status);
  }

  /**
   * Get all at-risk objectives
   */
  async getAtRiskObjectives(): Promise<Objective[]> {
    const graph = await this.getGraph();
    return graph.objectives.filter(
      (obj) => obj.status === 'at-risk' || (obj.healthScore ? obj.healthScore < 5 : false)
    );
  }

  /**
   * Get objectives by owner agent
   */
  async getObjectivesByAgent(agentId: string): Promise<Objective[]> {
    const graph = await this.getGraph();
    return graph.objectives.filter((obj) => obj.ownerAgent === agentId);
  }

  /**
   * Get epics for an objective
   */
  async getEpicsForObjective(objectiveId: string): Promise<Epic[]> {
    const graph = await this.getGraph();
    return graph.epics.filter((epic) => epic.objectiveId === objectiveId);
  }

  /**
   * Build and compute health summary
   */
  async computeHealthSummary(): Promise<{
    totalObjectives: number;
    healthy: number;
    atRisk: number;
    averageHealthScore: number;
  }> {
    const graph = await this.getGraph();

    const healthy = graph.objectives.filter((obj) => obj.status === 'healthy').length;
    const atRisk = graph.objectives.filter((obj) => obj.status === 'at-risk').length;

    const scoreSum = graph.objectives.reduce((sum, obj) => sum + (obj.healthScore || 0), 0);
    const averageHealthScore = graph.objectives.length > 0 ? scoreSum / graph.objectives.length : 0;

    const summary = {
      totalObjectives: graph.objectives.length,
      healthy,
      atRisk,
      averageHealthScore: Math.round(averageHealthScore * 100) / 100,
    };

    graph.healthSummary = summary;
    graph.generatedAt = new Date().toISOString();
    this.writeText(this.graphPath, JSON.stringify(graph, null, 2));

    return summary;
  }

  /**
   * Export graph for API consumption
   */
  async exportGraph(): Promise<ObjectiveGraph> {
    const graph = await this.getGraph();
    const summary = await this.computeHealthSummary();
    graph.healthSummary = summary;
    return graph;
  }
}

export async function createObjectiveGraphService(
  ctx: ServiceContext
): Promise<ObjectiveGraphService> {
  const service = new ObjectiveGraphService(ctx);
  await service.initializeGraph();
  return service;
}
