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

describe('routes/reasoning-collaboration', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerReasoningCollaborationRoutes(app, createContext());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists reasoning profiles and supports profile selection', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/reasoning-profiles',
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = listRes.json();
    expect(listBody.ok).toBe(true);
    expect(listBody.total).toBeGreaterThan(0);

    const selectRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/reasoning-profiles/select',
      payload: {
        agentId: '06',
        taskComplexity: 0.9,
        uncertainty: 0.8,
        isHighRiskDeliverable: true,
      },
    });

    expect(selectRes.statusCode).toBe(200);
    expect(selectRes.json().selection.profileId).toBe('verification-heavy');
  });

  it('runs verifier checks and lists verifier results', async () => {
    const runRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/verifier/run',
      payload: {
        deliverableSource: 'BusinessDocs/draft.md',
        content: '# Draft\n\nTODO: finalize checklist',
        agentId: '05',
        riskCategory: 'architecture',
      },
    });

    expect(runRes.statusCode).toBe(422);
    expect(runRes.json().result.verdict).toBe('fail');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/verifier/results',
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBeGreaterThan(0);
  });

  it('handles A2A messaging and conversation retrieval', async () => {
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/a2a/messages',
      payload: {
        type: 'request',
        fromAgentId: '05',
        toAgentId: '08',
        payload: {
          summary: 'Please review this architecture decision',
        },
      },
    });

    expect(sendRes.statusCode).toBe(201);
    const sent = sendRes.json().message;

    const convoRes = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/a2a/conversations/${sent.correlationId}`,
    });

    expect(convoRes.statusCode).toBe(200);
    expect(convoRes.json().conversation.messages.length).toBe(1);
  });

  it('opens and responds to peer clarification workflows', async () => {
    const openRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/peer-clarification/workflows',
      payload: {
        initiatorAgentId: '11',
        responderAgentId: '32',
        topic: 'Copy consistency',
        questions: ['Is this CTA consistent with voice guidelines?'],
      },
    });

    expect(openRes.statusCode).toBe(201);
    const workflow = openRes.json().workflow;

    const respondRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/peer-clarification/workflows/${workflow.id}/respond`,
      payload: {
        respondingAgentId: '32',
        answers: [
          {
            questionId: 'Q-1',
            answer: 'Yes, but shorten the sentence for readability.',
            followUpNeeded: false,
          },
        ],
      },
    });

    expect(respondRes.statusCode).toBe(200);
    expect(respondRes.json().workflow.status).toBe('resolved');
  });

  it('records collaboration traces and computes summary', async () => {
    const traceRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/collaboration/traces',
      payload: {
        messageId: 'A2A-100',
        correlationId: 'COR-100',
        messageType: 'clarification',
        fromAgentId: '05',
        toAgentId: '08',
        payloadSummary: 'Clarify data retention model',
      },
    });

    expect(traceRes.statusCode).toBe(201);

    const summaryRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/collaboration/summary',
    });

    expect(summaryRes.statusCode).toBe(200);
    expect(summaryRes.json().summary.totalMessages).toBeGreaterThan(0);
  });

  it('gets profile by id and records profile performance updates', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/reasoning-profiles',
    });
    const profileId = listRes.json().profiles[0].id as string;

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/reasoning-profiles/${profileId}`,
    });

    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().profile.id).toBe(profileId);

    const perfRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/reasoning-profiles/performance',
      payload: {
        profileId,
        qualityScore: 0.9,
        success: true,
      },
    });

    expect(perfRes.statusCode).toBe(200);
    expect(perfRes.json().ok).toBe(true);
  });

  it('returns 404 for unknown profile and verifier result IDs', async () => {
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/reasoning-profiles/unknown-profile',
    });
    expect(profileRes.statusCode).toBe(404);

    const verifierRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/verifier/results/unknown-result',
    });
    expect(verifierRes.statusCode).toBe(404);
  });

  it('gets verifier result by id and records self-revision against it', async () => {
    const runRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/verifier/run',
      payload: {
        deliverableSource: 'BusinessDocs/verifier-self-revision.md',
        content: '# Draft\n\nUNCERTAIN: needs source',
        agentId: '08',
        riskCategory: 'security',
      },
    });

    const verifierId = runRes.json().result.id as string;

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/verifier/results/${verifierId}`,
    });
    expect(getRes.statusCode).toBe(200);

    const revisionRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/verifier/results/${verifierId}/self-revision`,
      payload: {
        summary: 'Resolved uncertainty with source references.',
        revisionsApplied: 1,
      },
    });

    expect(revisionRes.statusCode).toBe(200);
    expect(revisionRes.json().result.selfRevisionApplied).toBe(true);
  });

  it('evaluates self-revision events and marks them as applied', async () => {
    const evaluateRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/self-revision/evaluate',
      payload: {
        agentId: '05',
        deliverableSource: 'BusinessDocs/arch.md',
        originalContent: '# Architecture\n\nDraft',
        trigger: 'quality-below-threshold',
        qualityScore: 0.2,
        qualityThreshold: 0.75,
      },
    });

    expect(evaluateRes.statusCode).toBe(200);
    expect(evaluateRes.json().revisionNeeded).toBe(true);
    const eventId = evaluateRes.json().event.id as string;

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/self-revision/events?applied=false',
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBeGreaterThan(0);

    const applyRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/self-revision/events/${eventId}/applied`,
      payload: {
        summary: 'Updated sections and checklist.',
      },
    });

    expect(applyRes.statusCode).toBe(200);
    expect(applyRes.json().event.applied).toBe(true);
  });

  it('returns 404 for unknown self-revision event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/self-revision/events/unknown/applied',
      payload: { summary: 'noop' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('supports message retrieval and delivery status update endpoints', async () => {
    const sendRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/a2a/messages',
      payload: {
        type: 'request',
        fromAgentId: '06',
        toAgentId: '21',
        payload: { summary: 'Please validate route tests' },
      },
    });

    const id = sendRes.json().message.id as string;

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/a2a/messages/${id}`,
    });
    expect(getRes.statusCode).toBe(200);

    const deliveredRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/messages/${id}/delivered`,
    });
    expect(deliveredRes.statusCode).toBe(200);
    expect(deliveredRes.json().message.status).toBe('delivered');

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/a2a/messages?toAgentId=21',
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBeGreaterThan(0);
  });

  it('returns 404 for unknown message and unknown conversation', async () => {
    const msgRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/a2a/messages/unknown-message',
    });
    expect(msgRes.statusCode).toBe(404);

    const convoRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/a2a/conversations/unknown-correlation',
    });
    expect(convoRes.statusCode).toBe(404);
  });

  it('exposes canonical peer pairs and supports workflow get/list/escalate', async () => {
    const pairsRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/peer-clarification/canonical-pairs',
    });
    expect(pairsRes.statusCode).toBe(200);
    expect(Object.keys(pairsRes.json().pairs).length).toBeGreaterThan(0);

    const openRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/peer-clarification/workflows',
      payload: {
        initiatorAgentId: '05',
        responderAgentId: '08',
        topic: 'Threat model alignment',
        questions: ['Is control segregation sufficient?'],
      },
    });

    const workflowId = openRes.json().workflow.id as string;

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/peer-clarification/workflows?status=awaiting-response',
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBeGreaterThan(0);

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/peer-clarification/workflows/${workflowId}`,
    });
    expect(getRes.statusCode).toBe(200);

    const escalateRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/peer-clarification/workflows/${workflowId}/escalate`,
      payload: { reason: 'Waiting beyond SLA' },
    });
    expect(escalateRes.statusCode).toBe(200);
    expect(escalateRes.json().workflow.status).toBe('escalated');
  });

  it('returns 404 for unknown peer clarification workflow operations', async () => {
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/peer-clarification/workflows/unknown',
    });
    expect(getRes.statusCode).toBe(404);

    const respondRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/peer-clarification/workflows/unknown/respond',
      payload: {
        respondingAgentId: '08',
        answers: [{ questionId: 'Q-1', answer: 'N/A' }],
      },
    });
    expect(respondRes.statusCode).toBe(404);

    const escalateRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/peer-clarification/workflows/unknown/escalate',
      payload: { reason: 'N/A' },
    });
    expect(escalateRes.statusCode).toBe(404);
  });

  it('supports collaboration trace list/get/outcome flows and 404 branches', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/collaboration/traces',
      payload: {
        messageId: 'A2A-300',
        correlationId: 'COR-300',
        messageType: 'peer-review-request',
        fromAgentId: '05',
        toAgentId: '08',
        payloadSummary: 'Review architecture control model',
      },
    });

    const traceId = createRes.json().trace.id as string;

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/collaboration/traces?fromAgentId=05',
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBeGreaterThan(0);

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/collaboration/traces/${traceId}`,
    });
    expect(getRes.statusCode).toBe(200);

    const outcomeRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/collaboration/traces/${traceId}/outcome`,
      payload: {
        outcome: 'acknowledged',
        latencyMs: 20,
      },
    });
    expect(outcomeRes.statusCode).toBe(200);
    expect(outcomeRes.json().trace.outcome).toBe('acknowledged');

    const getMissingRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/collaboration/traces/unknown',
    });
    expect(getMissingRes.statusCode).toBe(404);

    const outcomeMissingRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/collaboration/traces/unknown/outcome',
      payload: { outcome: 'expired' },
    });
    expect(outcomeMissingRes.statusCode).toBe(404);
  });

  it('supports capability discovery for contested A2A routing decisions', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/a2a/capability-discovery',
      payload: {
        requiredCapabilities: ['architecture', 'review'],
        phase: 'PHASE_2',
        contestedAgentIds: ['06'],
        minSuccessRate: 60,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json().result.candidates)).toBe(true);
    expect(typeof res.json().result.contested).toBe('boolean');
  });

  it('executes dispute, rebuttal, fan-in, governance evaluation, and resolution flows', async () => {
    const openRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/a2a/disputes',
      payload: {
        correlationId: 'COR-500',
        topic: 'Conflicting implementation outputs',
        positions: [
          {
            agentId: '05',
            summary: 'Prefer architecture-first rollout',
            confidence: 0.71,
            evidencePaths: ['BusinessDocs/architecture/plan-a.md'],
          },
          {
            agentId: '06',
            summary: 'Prefer implementation-first rollout',
            confidence: 0.7,
            evidencePaths: ['BusinessDocs/architecture/plan-b.md'],
          },
        ],
      },
    });

    expect(openRes.statusCode).toBe(201);
    const disputeId = openRes.json().dispute.id as string;

    const rebuttalRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/rebuttal`,
      payload: {
        fromAgentId: '06',
        targetAgentId: '05',
        points: ['Architecture-first delays integration signal collection'],
        evidencePaths: ['BusinessDocs/architecture/risk-log.md'],
      },
    });
    expect(rebuttalRes.statusCode).toBe(200);
    expect(rebuttalRes.json().dispute.status).toBe('under-rebuttal');

    const fanInRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/fan-in`,
      payload: {
        strategy: 'evidence-weighted',
      },
    });
    expect(fanInRes.statusCode).toBe(200);
    expect(fanInRes.json().dispute.fanIn).toBeDefined();

    const governanceRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/governance-evaluate`,
      payload: {
        highImpact: true,
        blastRadius: 4,
        requireHumanApprovalAtOrAbove: 'high',
      },
    });

    expect(governanceRes.statusCode).toBe(200);
    expect(governanceRes.json().dispute.governance.required).toBe(true);
    expect(governanceRes.json().dispute.status).toBe('escalated');

    const resolveRes = await app.inject({
      method: 'POST',
      url: `/api/reasoning-collaboration/a2a/disputes/${disputeId}/resolve`,
      payload: {
        selectedAgentId: '05',
        summary: 'Human reviewer approved architecture-first path with mitigations.',
        approvedBy: ['Security Architect'],
      },
    });

    expect(resolveRes.statusCode).toBe(200);
    expect(resolveRes.json().dispute.status).toBe('resolved');

    const transitionsRes = await app.inject({
      method: 'GET',
      url: `/api/reasoning-collaboration/collaboration/state-transitions?disputeId=${disputeId}`,
    });

    expect(transitionsRes.statusCode).toBe(200);
    expect(transitionsRes.json().total).toBeGreaterThanOrEqual(4);
  });

  it('records and lists coordination state transitions directly', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/reasoning-collaboration/collaboration/state-transitions',
      payload: {
        disputeId: 'DSP-900',
        correlationId: 'COR-900',
        toState: 'dispute-opened',
        initiatedBy: '05',
      },
    });

    expect(createRes.statusCode).toBe(201);

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reasoning-collaboration/collaboration/state-transitions?disputeId=DSP-900',
    });

    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().total).toBe(1);
  });
});
