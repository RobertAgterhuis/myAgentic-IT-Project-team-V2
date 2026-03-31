// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServiceContext } from '../../src/webapp/services/types';
import { createReasoningProfileService } from '../../platform/engine/reasoning-profile';
import { createVerifierPassService } from '../../platform/engine/verifier-pass';
import { createSelfRevisionService } from '../../platform/engine/self-revision';
import { createA2AMessagingService } from '../../platform/engine/a2a-messaging';
import { createA2ACoordinationService } from '../../platform/engine/a2a-coordination';
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

    const succeeded = await revisionSvc.markSucceeded(
      event!.id,
      'Reinvocation produced a compliant output'
    );
    expect(succeeded?.status).toBe('succeeded');
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

  it('supports reasoning profile override, fallback, and performance update retrieval', async () => {
    const svc = createReasoningProfileService(ctx);

    const overridden = await svc.selectProfile({
      agentId: '05',
      overrideProfileId: 'debate',
    });
    expect(overridden.profileId).toBe('debate');

    const fallback = await svc.selectProfile({
      agentId: 'unknown-agent',
      taskComplexity: 0,
      uncertainty: 0,
      isHighRiskDeliverable: false,
    });
    expect(fallback.profileId).toBe('fast');

    await svc.updatePerformanceHistory({
      profileId: 'fast',
      qualityScore: 0.8,
      success: true,
    });

    const fast = await svc.getProfile('fast');
    expect(fast?.performanceHistory.sampleCount).toBeGreaterThan(0);
  });

  it('covers verifier pass success and not-found recordSelfRevision paths', async () => {
    const svc = createVerifierPassService(ctx);

    const passResult = await svc.runVerifierPass({
      deliverableSource: 'BusinessDocs/clean.md',
      agentId: '05',
      riskCategory: 'architecture',
      content:
        '## HANDOFF CHECKLIST\n- [x] complete\n\nSource: src/webapp/routes/manifest.ts:1\n\nArchitecture decision references diagram and ADR.',
    });

    expect(passResult.verdict).toBe('pass');

    const listed = await svc.listResults({ verdict: 'pass' });
    expect(listed.length).toBeGreaterThan(0);

    const byId = await svc.getResult(passResult.id);
    expect(byId?.id).toBe(passResult.id);

    const missing = await svc.recordSelfRevision('unknown', 'noop', 0);
    expect(missing).toBeUndefined();
  });

  it('covers self-revision no-op path and filter/get branches', async () => {
    const svc = createSelfRevisionService(ctx);

    const noEvent = await svc.evaluateRevisionNeed({
      agentId: '11',
      deliverableSource: 'BusinessDocs/ux.md',
      originalContent: 'clean content',
      trigger: 'quality-below-threshold',
      verifierFindings: [],
      qualityScore: 0.95,
      qualityThreshold: 0.75,
    });

    expect(noEvent).toBeNull();

    const manualEvent = await svc.evaluateRevisionNeed({
      agentId: '11',
      deliverableSource: 'BusinessDocs/ux.md',
      originalContent: 'draft',
      trigger: 'manual',
      verifierFindings: [],
      qualityScore: 1,
      qualityThreshold: 0.75,
    });

    expect(manualEvent).not.toBeNull();

    const filtered = await svc.listEvents({ applied: false, agentId: '11' });
    expect(filtered.length).toBeGreaterThan(0);

    const getEvent = await svc.getEvent(manualEvent!.id);
    expect(getEvent?.id).toBe(manualEvent?.id);

    const missingApplied = await svc.markApplied('unknown-event', 'noop');
    expect(missingApplied).toBeUndefined();

    const escalated = await svc.markEscalated(
      manualEvent!.id,
      'Revision budget exhausted',
      'max-revision-attempts'
    );
    expect(escalated?.status).toBe('escalated');
    expect(escalated?.terminalReason).toBe('max-revision-attempts');
  });

  it('covers A2A messaging reply, expiry, filters, and not-found branches', async () => {
    const svc = createA2AMessagingService(ctx);

    const sent = await svc.sendMessage({
      type: 'request',
      fromAgentId: '05',
      toAgentId: '06',
      payload: { summary: 'Need implementation review' },
      ttlSeconds: 0,
    });

    const delivered = await svc.markDelivered(sent.id);
    expect(delivered?.status).toBe('delivered');

    const read = await svc.markRead(sent.id);
    expect(read?.status).toBe('read');

    const replied = await svc.markReplied(sent.id);
    expect(replied?.status).toBe('replied');

    const filtered = await svc.listMessages({ toAgentId: '06', status: 'replied' });
    expect(filtered.length).toBeGreaterThan(0);

    const byId = await svc.getMessage(sent.id);
    expect(byId?.id).toBe(sent.id);

    const expired = await svc.pruneExpired();
    expect(expired).toBeGreaterThanOrEqual(0);

    const missing = await svc.markDelivered('missing-id');
    expect(missing).toBeUndefined();

    const noConvo = await svc.getConversation('missing-correlation');
    expect(noConvo).toBeUndefined();
  });

  it('covers peer clarification escalation and unresolved round branches', async () => {
    const svc = createPeerClarificationService(ctx);

    const workflow = await svc.openClarification({
      initiatorAgentId: '05',
      responderAgentId: '08',
      topic: 'Threat model review',
      questions: ['Missing STRIDE mapping?'],
      maxRounds: 1,
    });

    const partial = await svc.respondToClarification({
      workflowId: workflow.id,
      respondingAgentId: '08',
      answers: [{ questionId: 'Q-1', answer: 'Partially, follow-up needed', followUpNeeded: true }],
      additionalQuestions: ['Can you include mitigations table?'],
    });

    expect(partial).toBeDefined();
    expect(partial?.status === 'escalated' || partial?.status === 'partially-answered').toBe(true);

    const escalated = await svc.escalateWorkflow(workflow.id, 'Manual escalation');
    expect(escalated?.status).toBe('escalated');

    const listed = await svc.listWorkflows({ responderAgentId: '08' });
    expect(listed.length).toBeGreaterThan(0);

    const byId = await svc.getWorkflow(workflow.id);
    expect(byId?.id).toBe(workflow.id);

    const missingRespond = await svc.respondToClarification({
      workflowId: 'missing',
      respondingAgentId: '08',
      answers: [{ questionId: 'Q-1', answer: 'n/a' }],
    });
    expect(missingRespond).toBeUndefined();

    const missingEscalate = await svc.escalateWorkflow('missing', 'n/a');
    expect(missingEscalate).toBeUndefined();

    expect(Object.keys(svc.listCanonicalPairs()).length).toBeGreaterThan(0);
  });

  it('covers collaboration tracer empty summary, filters, and not-found branches', async () => {
    const svc = createA2ACollaborationTracer(ctx);

    const empty = await svc.computeSummary();
    expect(empty.totalMessages).toBe(0);

    const trace = await svc.recordTrace({
      messageId: 'A2A-22',
      correlationId: 'COR-22',
      messageType: 'clarification',
      fromAgentId: '11',
      toAgentId: '32',
      payloadSummary: 'Copy review request',
      phase: 'PHASE_3',
      tags: ['ux'],
    });

    const listed = await svc.listTraces({ fromAgentId: '11', phase: 'PHASE_3' });
    expect(listed.length).toBeGreaterThan(0);

    const found = await svc.getTrace(trace.id);
    expect(found?.id).toBe(trace.id);

    const updated = await svc.updateOutcome({
      traceId: trace.id,
      outcome: 'acknowledged',
      latencyMs: 42,
    });
    expect(updated?.outcome).toBe('acknowledged');

    const missing = await svc.updateOutcome({
      traceId: 'missing-trace',
      outcome: 'expired',
    });
    expect(missing).toBeUndefined();

    const bounded = await svc.computeSummary(
      new Date(Date.now() - 60_000).toISOString(),
      new Date(Date.now() + 60_000).toISOString()
    );
    expect(bounded.totalMessages).toBeGreaterThan(0);
  });

  it('discovers capability-compatible agents and marks contested routing when candidates are close', async () => {
    const svc = createA2ACoordinationService(ctx);

    const result = await svc.discoverCapabilities({
      requiredCapabilities: ['architecture', 'review'],
      phase: 'PHASE_2',
      minSuccessRate: 60,
      contestedAgentIds: ['06'],
      limit: 5,
    });

    expect(Array.isArray(result.candidates)).toBe(true);
    expect(typeof result.contested).toBe('boolean');
    expect(result.rationale.length).toBeGreaterThan(0);
  });

  it('runs dispute/rebuttal/fan-in/governance lifecycle with escalation for unresolved high-impact divergence', async () => {
    const svc = createA2ACoordinationService(ctx);

    const dispute = await svc.openDispute({
      correlationId: 'COR-M4-1',
      topic: 'Conflicting architecture proposals',
      positions: [
        {
          agentId: '05',
          summary: 'Proposal A',
          confidence: 0.72,
          evidencePaths: ['BusinessDocs/architecture/a.md'],
        },
        {
          agentId: '06',
          summary: 'Proposal B',
          confidence: 0.7,
          evidencePaths: ['BusinessDocs/architecture/b.md'],
        },
      ],
    });

    expect(dispute.status).toBe('open');

    const rebutted = await svc.submitRebuttal({
      disputeId: dispute.id,
      fromAgentId: '06',
      targetAgentId: '05',
      points: ['Proposal A ignores integration constraints'],
      evidencePaths: ['BusinessDocs/architecture/constraints.md'],
    });
    expect(rebutted?.status).toBe('under-rebuttal');

    const synthesized = await svc.synthesizeFanIn({
      disputeId: dispute.id,
      strategy: 'evidence-weighted',
    });
    expect(synthesized?.fanIn).toBeDefined();

    const governed = await svc.evaluateGovernance({
      disputeId: dispute.id,
      highImpact: true,
      blastRadius: 5,
      requireHumanApprovalAtOrAbove: 'high',
    });

    expect(governed?.governance?.required).toBe(true);
    expect(governed?.status).toBe('escalated');
  });

  it('records and filters coordination state transitions', async () => {
    const svc = createA2ACollaborationTracer(ctx);

    await svc.recordCoordinationStateTransition({
      disputeId: 'DSP-1',
      correlationId: 'COR-1',
      toState: 'dispute-opened',
      initiatedBy: '05',
    });

    await svc.recordCoordinationStateTransition({
      disputeId: 'DSP-1',
      correlationId: 'COR-1',
      fromState: 'fan-in-synthesized',
      toState: 'governance-review-required',
      riskLevel: 'high',
      reason: 'Low consensus and high blast radius',
    });

    const all = await svc.listCoordinationStateTransitions({ disputeId: 'DSP-1' });
    expect(all.length).toBe(2);

    const highRisk = await svc.listCoordinationStateTransitions({ riskLevel: 'high' });
    expect(highRisk.length).toBe(1);
    expect(highRisk[0].toState).toBe('governance-review-required');
  });
});
