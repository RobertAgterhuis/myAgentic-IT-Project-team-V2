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
});
