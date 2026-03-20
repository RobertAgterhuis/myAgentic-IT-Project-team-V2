// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Cockpit API routes — M27 Operational Cockpit UI
 *
 * Endpoints:
 *   GET  /api/v1/cockpit/health        — Confidence scores (session, sprint, agent)
 *   GET  /api/v1/cockpit/dependencies  — Dependency graph (decisions → gates → sprints)
 *   GET  /api/v1/cockpit/root-cause    — Root-cause analysis items
 *   GET  /api/v1/cockpit/provenance    — Human/machine decision provenance feed
 *   GET  /api/v1/approvals/:id/detail  — Approval detail with context
 *   GET  /api/v1/approvals/history     — Full approval history
 *
 * @module routes/cockpit
 * @param {object} ctx - Shared server context
 * @returns {object} Route map { 'METHOD /path': handler }
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import fs from 'fs';
import path from 'path';
import { errorResponse } from '../utils/errors';

function getRepoRoot(ctx: Record<string, unknown>): string {
  return (ctx?.PROJECT_ROOT as string) || path.resolve(__dirname, '..', '..', '..');
}

function safeReadJson(filePath: string, fallback: unknown): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

/**
 * Compute a confidence score from contributing factors.
 */
function computeScore(factors: { label: string; value: number; weight: number }[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = factors.reduce((sum, f) => sum + f.value * f.weight, 0);
  return Math.round(weighted / totalWeight);
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const legacyCtx = ctx as unknown as Record<string, unknown>;

  type ProvenanceItem = {
    id: string;
    decision_type: 'human_override' | 'approval' | 'policy_exception' | 'gate_failure' | 'error';
    actor_type: 'human' | 'machine';
    actor: string;
    action: string;
    rationale: string;
    source: string;
    state?: string;
    mode?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  };

  type ProvenanceQuery = {
    actor_type?: 'human' | 'machine';
    decision_type?: 'human_override' | 'approval' | 'policy_exception' | 'gate_failure' | 'error';
    source?: string;
    from?: string;
    to?: string;
    page?: string;
    page_size?: string;
  };

  // ── GET /api/v1/cockpit/health ───────────────────────────

  app.get(
    '/api/v1/cockpit/health',
    { schema: { tags: ['cockpit'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const root = getRepoRoot(legacyCtx);
      const sessionState = safeReadJson(
        path.join(root, 'BusinessDocs', 'session', 'session-state.json'),
        {}
      ) as Record<string, unknown>;

      const gatesPassed = Number(sessionState.gates_passed ?? 0);
      const gatesTotal = Math.max(Number(sessionState.gates_total ?? 1), 1);
      const decisionsResolved = Number(sessionState.decisions_resolved ?? 0);
      const decisionsTotal = Math.max(Number(sessionState.decisions_total ?? 1), 1);
      const questionnairesComplete = Number(sessionState.questionnaires_complete ?? 0);
      const questionnairesTotal = Math.max(Number(sessionState.questionnaires_total ?? 1), 1);
      const errorCount = Number(sessionState.error_count ?? 0);

      const sessionFactors = [
        { label: 'Gates passed', value: Math.round((gatesPassed / gatesTotal) * 100), weight: 3 },
        {
          label: 'Decisions resolved',
          value: Math.round((decisionsResolved / decisionsTotal) * 100),
          weight: 2,
        },
        {
          label: 'Questionnaires complete',
          value: Math.round((questionnairesComplete / questionnairesTotal) * 100),
          weight: 2,
        },
        { label: 'Error-free', value: Math.max(0, 100 - errorCount * 10), weight: 1 },
      ];

      const storiesReady = Number(sessionState.stories_ready ?? 0);
      const storiesTotal = Math.max(Number(sessionState.stories_total ?? 1), 1);
      const blockingItems = Number(sessionState.blocking_items ?? 0);

      const sprintFactors = [
        {
          label: 'Stories ready',
          value: Math.round((storiesReady / storiesTotal) * 100),
          weight: 3,
        },
        {
          label: 'No blockers',
          value: blockingItems === 0 ? 100 : Math.max(0, 50 - blockingItems * 10),
          weight: 2,
        },
        {
          label: 'Dependencies resolved',
          value: Math.round((decisionsResolved / decisionsTotal) * 100),
          weight: 1,
        },
      ];

      const uncertainCount = Number(sessionState.uncertain_count ?? 0);
      const insufficientCount = Number(sessionState.insufficient_data_count ?? 0);
      const agentTotal = Math.max(Number(sessionState.agents_total ?? 1), 1);

      const agentFactors = [
        { label: 'No UNCERTAIN markers', value: Math.max(0, 100 - uncertainCount * 15), weight: 2 },
        {
          label: 'No INSUFFICIENT_DATA markers',
          value: Math.max(0, 100 - insufficientCount * 15),
          weight: 2,
        },
        {
          label: 'Agents completed',
          value: Math.round(((agentTotal - errorCount) / agentTotal) * 100),
          weight: 1,
        },
      ];

      return reply.send({
        ok: true,
        session_health: {
          label: 'Session Health',
          score: computeScore(sessionFactors),
          factors: sessionFactors,
        },
        sprint_readiness: {
          label: 'Sprint Readiness',
          score: computeScore(sprintFactors),
          factors: sprintFactors,
        },
        agent_confidence: {
          label: 'Agent Confidence',
          score: computeScore(agentFactors),
          factors: agentFactors,
        },
      });
    }
  );

  // ── GET /api/v1/cockpit/dependencies ─────────────────────

  app.get(
    '/api/v1/cockpit/dependencies',
    { schema: { tags: ['cockpit'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const root = getRepoRoot(legacyCtx);

      const nodes: Array<{ id: string; type: string; label: string; status: string }> = [];
      const edges: Array<{
        source: string;
        target: string;
        relationship: string;
        critical: boolean;
      }> = [];
      const criticalPath: string[] = [];

      const phases = ['PHASE-1', 'PHASE-2', 'PHASE-3', 'PHASE-4', 'PHASE-5'];
      phases.forEach((phase) => {
        nodes.push({
          id: `sprint-${phase}`,
          type: 'sprint',
          label: phase.replace('-', ' '),
          status: 'pending',
        });
      });

      phases.forEach((phase) => {
        const gateId = `gate-${phase}`;
        nodes.push({ id: gateId, type: 'gate', label: `${phase} Gate`, status: 'pending' });
        edges.push({
          source: gateId,
          target: `sprint-${phase}`,
          relationship: 'blocks',
          critical: true,
        });
      });

      const sessionState = safeReadJson(
        path.join(root, 'BusinessDocs', 'session', 'session-state.json'),
        {}
      ) as Record<string, unknown>;

      const currentPhase = String(sessionState.current_phase ?? 'PHASE-1');

      for (const node of nodes) {
        if (node.type === 'sprint') {
          const phase = node.id.replace('sprint-', '');
          const phaseIdx = phases.indexOf(phase);
          const currentIdx = phases.indexOf(currentPhase);
          if (phaseIdx < currentIdx) node.status = 'resolved';
          else if (phaseIdx === currentIdx) node.status = 'pending';
          else node.status = 'blocked';
        }
        if (node.type === 'gate') {
          const phase = node.id.replace('gate-', '');
          const phaseIdx = phases.indexOf(phase);
          const currentIdx = phases.indexOf(currentPhase);
          if (phaseIdx < currentIdx) node.status = 'passed';
          else node.status = 'pending';
        }
      }

      const currentGate = `gate-${currentPhase}`;
      criticalPath.push(currentGate, `sprint-${currentPhase}`);

      return reply.send({ ok: true, nodes, edges, critical_path: criticalPath });
    }
  );

  // ── GET /api/v1/cockpit/root-cause ───────────────────────

  app.get(
    '/api/v1/cockpit/root-cause',
    { schema: { tags: ['cockpit'] } },
    async (
      request: FastifyRequest<{ Querystring: { session_id?: string } }>,
      reply: FastifyReply
    ) => {
      const sessionId = request.query.session_id || undefined;
      const root = getRepoRoot(legacyCtx);
      const items: Array<{
        id: string;
        type: string;
        summary: string;
        source_agent?: string;
        source_file?: string;
        cause_chain: string[];
        actionable_link?: string;
        actionable_type?: string;
        timestamp: string;
      }> = [];

      const auditPath = path.join(root, 'BusinessDocs', 'audit', 'audit-log.jsonl');
      try {
        const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
        let idx = 0;
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as Record<string, unknown>;
            if (sessionId && entry.session_id !== sessionId) continue;
            if (entry.event === 'gate_failed' || entry.event === 'error') {
              items.push({
                id: `rc-${idx++}`,
                type: entry.event === 'gate_failed' ? 'gate_failure' : 'uncertain',
                summary: String(entry.description || entry.message || 'Unknown failure'),
                source_agent: entry.agent as string | undefined,
                source_file: entry.file as string | undefined,
                cause_chain: (entry.cause_chain as string[]) || [
                  String(entry.description || 'Root cause unknown'),
                ],
                actionable_link: entry.actionable_link as string | undefined,
                actionable_type: entry.actionable_type as string | undefined,
                timestamp: String(entry.timestamp || new Date().toISOString()),
              });
            }
          } catch {
            /* skip malformed lines */
          }
        }
      } catch {
        /* audit log may not exist yet */
      }

      return reply.send({ ok: true, items, session_id: sessionId });
    }
  );

  // ── GET /api/v1/cockpit/provenance ───────────────────────

  app.get(
    '/api/v1/cockpit/provenance',
    { schema: { tags: ['cockpit'] } },
    async (request: FastifyRequest<{ Querystring: ProvenanceQuery }>, reply: FastifyReply) => {
      const root = getRepoRoot(legacyCtx);
      const items: ProvenanceItem[] = [];
      let idx = 0;
      const query = request.query || {};

      const getHumanOverrideEvents = legacyCtx._getHumanOverrideEvents as
        | (() => Array<{
            type: string;
            rationale: string;
            requested_by: string;
            timestamp: string;
            state?: string;
            mode?: string;
            phases?: string[];
          }>)
        | undefined;

      for (const event of getHumanOverrideEvents?.() || []) {
        items.push({
          id: `prov-${idx++}`,
          decision_type: 'human_override',
          actor_type: 'human',
          actor: event.requested_by || 'operator',
          action: event.type,
          rationale: event.rationale || 'No rationale provided',
          source: 'orchestrator-control',
          state: event.state,
          mode: event.mode,
          timestamp: event.timestamp || new Date().toISOString(),
          metadata: event.phases ? { phases: event.phases } : undefined,
        });
      }

      const auditPath = path.join(root, 'BusinessDocs', 'audit', 'audit-log.jsonl');
      try {
        const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as Record<string, unknown>;
            const event = String(entry.event || '');

            if (event === 'approval_decided') {
              items.push({
                id: `prov-${idx++}`,
                decision_type: 'approval',
                actor_type: 'human',
                actor: String(entry.user || 'operator'),
                action: String(entry.action || 'APPROVED'),
                rationale: String(entry.reason || 'No reason provided'),
                source: 'governance-approval',
                timestamp: String(entry.timestamp || new Date().toISOString()),
                metadata: {
                  approval_id: entry.approval_id,
                  gate_id: entry.gate_id,
                },
              });
            }

            if (event === 'policy_exception') {
              items.push({
                id: `prov-${idx++}`,
                decision_type: 'policy_exception',
                actor_type: 'human',
                actor: String(entry.approved_by || entry.user || 'operator'),
                action: 'EXCEPTION_GRANTED',
                rationale: String(entry.reason || 'Policy exception granted'),
                source: 'policy-governance',
                timestamp: String(entry.timestamp || new Date().toISOString()),
                metadata: {
                  policy_id: entry.policy_id,
                  scope_override: entry.scope_override,
                },
              });
            }

            if (event === 'gate_failed') {
              items.push({
                id: `prov-${idx++}`,
                decision_type: 'gate_failure',
                actor_type: 'machine',
                actor: String(entry.agent || 'orchestrator'),
                action: 'GATE_BLOCKED',
                rationale: String(entry.description || entry.message || 'Gate validation failed'),
                source: 'gate-validator',
                timestamp: String(entry.timestamp || new Date().toISOString()),
                metadata: {
                  phase: entry.phase,
                  violations: entry.violations,
                },
              });
            }

            if (event === 'error') {
              items.push({
                id: `prov-${idx++}`,
                decision_type: 'error',
                actor_type: 'machine',
                actor: String(entry.agent || 'orchestrator'),
                action: 'ERROR_RECORDED',
                rationale: String(entry.description || entry.message || 'System error recorded'),
                source: 'runtime-error',
                timestamp: String(entry.timestamp || new Date().toISOString()),
                metadata: {
                  code: entry.code,
                },
              });
            }
          } catch {
            /* ignore malformed audit lines */
          }
        }
      } catch {
        /* audit log may not exist */
      }

      items.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
      let filtered = items;

      if (query.actor_type) {
        filtered = filtered.filter((item) => item.actor_type === query.actor_type);
      }

      if (query.decision_type) {
        filtered = filtered.filter((item) => item.decision_type === query.decision_type);
      }

      if (query.source) {
        filtered = filtered.filter((item) => item.source === query.source);
      }

      if (query.from) {
        filtered = filtered.filter((item) => item.timestamp >= query.from!);
      }

      if (query.to) {
        filtered = filtered.filter((item) => item.timestamp <= query.to!);
      }

      const rawPage = Number.parseInt(query.page || '1', 10);
      const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
      const rawPageSize = Number.parseInt(query.page_size || '25', 10);
      const pageSize =
        Number.isFinite(rawPageSize) && rawPageSize > 0
          ? Math.min(Math.max(rawPageSize, 1), 100)
          : 25;
      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      return reply.send({
        ok: true,
        count: pageItems.length,
        total,
        page,
        page_size: pageSize,
        items: pageItems,
      });
    }
  );

  // ── GET /api/v1/approvals/:id/detail ─────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/v1/approvals/:id/detail',
    { schema: { tags: ['cockpit'] } },
    async (request, reply) => {
      const id = decodeURIComponent(request.params.id);
      if (!id) {
        return reply.code(400).send(errorResponse('MISSING_ID', 'Approval ID is required'));
      }

      const getEngine = legacyCtx._getEngine as
        | (() => { approvalRegistry?: { get: (id: string) => unknown } })
        | undefined;
      const engine = getEngine?.();
      const registry = engine?.approvalRegistry;

      if (!registry) {
        return reply.send({
          ok: true,
          approval: {
            id,
            entity_id: id,
            gate_id: 'unknown',
            stage: 'unknown',
            requested_by: 'system',
            requested_at: new Date().toISOString(),
            required_role: 'operator',
            status: 'PENDING',
            context: 'Approval context not available — engine not initialized.',
            risk_assessment: 'Unable to assess risk without engine context.',
            recommended_action: 'Review manually.',
            related_artifacts: [],
          },
        });
      }

      const approval = registry.get(id);
      if (!approval) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Approval not found: ${id}`));
      }

      return reply.send({ ok: true, approval });
    }
  );

  // ── GET /api/v1/approvals/history ────────────────────────

  app.get(
    '/api/v1/approvals/history',
    { schema: { tags: ['cockpit'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const root = getRepoRoot(legacyCtx);
      const history: Array<{
        id: string;
        approval_id: string;
        action: string;
        user: string;
        reason: string;
        decided_at: string;
      }> = [];

      const auditPath = path.join(root, 'BusinessDocs', 'audit', 'audit-log.jsonl');
      try {
        const lines = fs.readFileSync(auditPath, 'utf8').split('\n').filter(Boolean);
        let idx = 0;
        for (const line of lines) {
          try {
            const entry = JSON.parse(line) as Record<string, unknown>;
            if (entry.event === 'approval_decided') {
              history.push({
                id: `ah-${idx++}`,
                approval_id: String(entry.approval_id || ''),
                action: String(entry.action || 'APPROVED'),
                user: String(entry.user || 'system'),
                reason: String(entry.reason || ''),
                decided_at: String(entry.timestamp || new Date().toISOString()),
              });
            }
          } catch {
            /* skip malformed */
          }
        }
      } catch {
        /* audit log may not exist */
      }

      return reply.send({ ok: true, history });
    }
  );
}
