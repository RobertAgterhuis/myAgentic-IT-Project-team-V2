// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceContext } from '../../src/webapp/services/types';
import { createReasoningProfileService } from '../../platform/engine/reasoning-profile';
import { createVerifierPassService } from '../../platform/engine/verifier-pass';
import { createSelfRevisionService } from '../../platform/engine/self-revision';
import { createA2AMessagingService } from '../../platform/engine/a2a-messaging';
import { createPeerClarificationService } from '../../platform/engine/peer-clarification';
import { createA2ACollaborationTracer } from '../../platform/engine/a2a-collaboration-tracer';

function createMockContext(): ServiceContext {
  const data = new Map<string, string>();

  const storeApi = {
    exists: vi.fn((filePath: string) => data.has(filePath)),
    readFile: vi.fn((filePath: string) => {
      const value = data.get(filePath);
      if (value === undefined) throw new Error(`ENOENT: ${filePath}`);
      return value;
    }),
    writeFile: vi.fn((filePath: string, content: string) => {
      data.set(filePath, content);
    }),
    mkdirp: vi.fn(),
    readdir: vi.fn(() => []),
    stat: vi.fn(),
    mtime: vi.fn(() => 0),
  };

  return {
    store: storeApi,
    cache: {} as ServiceContext['cache'],
    audit: {} as ServiceContext['audit'],
    projectRoot: '.',
    businessDocs: 'BusinessDocs',
    sessionDir: 'BusinessDocs/session',
    decisionsFile: 'BusinessDocs/decisions.md',
    decisionsDir: 'BusinessDocs/decisions',
    commandQueue: 'BusinessDocs/command-queue.jsonl',
    helpDir: 'docs/help',
    safeWrite: vi.fn((filePath: string, dataText: string) => {
      data.set(filePath, dataText);
    }),
  } as unknown as ServiceContext;
}

describe('reasoning-collaboration services', () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('selects verification-heavy profile for high-risk work', async () => {
    const svc = createReasoningProfileService(ctx);

    const selected = await svc.selectProfile({
      agentId: '06',
      taskComplexity: 0.8,
      uncertainty: 0.7,
      isHighRiskDeliverable: true,
    });

    expect(selected.profileId).toBe('verification-heavy');
    expect(selected.verifierEnabled).toBe(true);
  });

  it('returns fail verdict when critical verifier rules are violated', async () => {
    const svc = createVerifierPassService(ctx);

    const result = await svc.runVerifierPass({
      deliverableSource: 'BusinessDocs/test.md',
      agentId: '05',
      riskCategory: 'architecture',
      content: '# Draft\n\nTODO: fill section\n',
    });

    expect(result.verdict).toBe('fail');
    expect(result.findings.some((f) => f.ruleId === 'VR-001')).toBe(true);
  });

  it('creates and applies self-revision events', async () => {
    const verifierSvc = createVerifierPassService(ctx);
    const revisionSvc = createSelfRevisionService(ctx);

    const verification = await verifierSvc.runVerifierPass({
      deliverableSource: 'BusinessDocs/security.md',
      agentId: '08',
      riskCategory: 'security',
      content: '# Security Review\n\nUNCERTAIN: control mapping pending',
    });

    const event = await revisionSvc.evaluateRevisionNeed({
      agentId: '08',
      deliverableSource: verification.deliverableSource,
      originalContent: 'content',
      trigger: 'verifier-findings',
      verifierFindings: verification.findings,
      qualityScore: verification.score,
    });

    expect(event).not.toBeNull();
    const applied = await revisionSvc.markApplied(event!.id, 'Resolved uncertainty markers');
    expect(applied?.applied).toBe(true);
  });

  it('supports A2A messaging lifecycle and conversation reconstruction', async () => {
    const svc = createA2AMessagingService(ctx);

    const sent = await svc.sendMessage({
      type: 'clarification',
      fromAgentId: '05',
      toAgentId: '08',
      payload: {
        summary: 'Need security clarification',
        clarificationQuestions: ['Which control applies to API secrets?'],
      },
    });

    await svc.markDelivered(sent.id);
    await svc.markRead(sent.id);

    const convo = await svc.getConversation(sent.correlationId);
    expect(convo).toBeDefined();
    expect(convo?.messages.length).toBe(1);
    expect(convo?.participants.sort()).toEqual(['05', '08']);
  });

  it('runs peer clarification workflows and resolves answered rounds', async () => {
    const svc = createPeerClarificationService(ctx);

    const workflow = await svc.openClarification({
      initiatorAgentId: '06',
      responderAgentId: '21',
      topic: 'Test coverage expectations',
      questions: ['Do we need route tests for all endpoints?'],
    });

    const responded = await svc.respondToClarification({
      workflowId: workflow.id,
      respondingAgentId: '21',
      answers: [
        {
          questionId: 'Q-1',
          answer: 'Yes for critical endpoints, smoke checks for the rest.',
          followUpNeeded: false,
        },
      ],
    });

    expect(responded).toBeDefined();
    expect(responded?.status).toBe('resolved');
  });

  it('records collaboration traces and summarizes outcomes', async () => {
    const svc = createA2ACollaborationTracer(ctx);

    const trace = await svc.recordTrace({
      messageId: 'A2A-1',
      correlationId: 'COR-1',
      messageType: 'peer-review-request',
      fromAgentId: '05',
      toAgentId: '08',
      payloadSummary: 'Review architecture threat controls',
    });

    await svc.updateOutcome({
      traceId: trace.id,
      outcome: 'acted-upon',
      latencyMs: 120,
    });

    const summary = await svc.computeSummary();
    expect(summary.totalMessages).toBe(1);
    expect(summary.byOutcome['acted-upon']).toBe(1);
    expect(summary.avgLatencyMs).toBe(120);
  });
});
