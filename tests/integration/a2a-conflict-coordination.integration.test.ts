// Copyright (c) 2026 Robert Agterhuis. MIT License.

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/webapp/store';
import type { ServiceContext } from '../../src/webapp/services/types';
import { registerReasoningCollaborationRoutes } from '../../src/webapp/routes/reasoning-collaboration';

function createContext(): ServiceContext {
  const store = new InMemoryStore();

  return {
    store,
    cache: {} as ServiceContext['cache'],
    audit: {} as ServiceContext['audit'],
    projectRoot: process.cwd(),
    businessDocs: 'BusinessDocs',
    sessionDir: 'BusinessDocs/session',
    decisionsFile: 'BusinessDocs/decisions.md',
    decisionsDir: 'BusinessDocs/decisions',
    commandQueue: 'BusinessDocs/command-queue.jsonl',
    helpDir: 'docs/help',
    safeWrite: (filePath: string, data: string) => {
      store.writeFile(filePath, data);
    },
  };
}

describe('integration/a2a-conflict-coordination', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerReasoningCollaborationRoutes(app, createContext());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('validates multi-agent conflict resolution protocol with governance escalation', async () => {
    const discovery = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/a2a/capability-discovery',
      payload: {
        requiredCapabilities: ['architecture', 'review'],
        phase: 'PHASE_2',
        minSuccessRate: 60,
      },
    });

    expect(discovery.statusCode).toBe(200);
    expect(Array.isArray(discovery.json().result.candidates)).toBe(true);

    const openDispute = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/a2a/disputes',
      payload: {
        correlationId: 'COR-INT-M4-1',
        topic: 'Parallel branch output conflict',
        positions: [
          {
            agentId: '05',
            summary: 'Prefer branch A',
            confidence: 0.71,
            evidencePaths: ['BusinessDocs/synthesis/branch-a.md'],
          },
          {
            agentId: '06',
            summary: 'Prefer branch B',
            confidence: 0.69,
            evidencePaths: ['BusinessDocs/synthesis/branch-b.md'],
          },
        ],
      },
    });

    expect(openDispute.statusCode).toBe(201);
    const disputeId = openDispute.json().dispute.id as string;

    const rebuttal = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/rebuttal`,
      payload: {
        fromAgentId: '06',
        targetAgentId: '05',
        points: ['Branch A omits cross-team dependency risk.'],
        evidencePaths: ['BusinessDocs/synthesis/dependency-risk.md'],
      },
    });

    expect(rebuttal.statusCode).toBe(200);

    const fanIn = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/fan-in`,
      payload: { strategy: 'evidence-weighted' },
    });

    expect(fanIn.statusCode).toBe(200);
    expect(fanIn.json().dispute.fanIn).toBeTruthy();

    const governance = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/governance-evaluate`,
      payload: {
        highImpact: true,
        blastRadius: 4,
        requireHumanApprovalAtOrAbove: 'high',
      },
    });

    expect(governance.statusCode).toBe(200);
    expect(governance.json().dispute.governance.required).toBe(true);
    expect(governance.json().dispute.status).toBe('escalated');

    const resolve = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/resolve`,
      payload: {
        selectedAgentId: '05',
        summary: 'Approved with mitigation plan for dependency risk.',
        approvedBy: ['08-security-architect'],
      },
    });

    expect(resolve.statusCode).toBe(200);
    expect(resolve.json().dispute.status).toBe('resolved');

    const transitions = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/collaboration/state-transitions?disputeId=${disputeId}`,
    });

    expect(transitions.statusCode).toBe(200);
    expect(transitions.json().total).toBeGreaterThanOrEqual(4);
  });
});
