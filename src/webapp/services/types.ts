// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Shared types for the service layer (M20-002).
 * Services depend on these interfaces — not on concrete implementations.
 */

import type { FileStore, InMemoryStore } from '../store';
import type { FileCache } from '../cache';
import type { AuditTrail } from '../audit';
import type { EmbeddingProviderFacade, RagStoreFacade, SemanticMemoryFacade } from '../context';

/* ── Store abstraction ────────────────────────────────────────── */

export type Store = FileStore | InMemoryStore;

/* ── Service context injected into every service ──────────────── */

export interface ServiceContext {
  store: Store;
  cache: FileCache;
  audit: AuditTrail;
  projectRoot: string;
  businessDocs: string;
  sessionDir: string;
  decisionsFile: string;
  decisionsDir: string;
  commandQueue: string;
  helpDir: string;
  ragStore?: RagStoreFacade;
  embeddingProvider?: EmbeddingProviderFacade;
  semanticMemoryStore?: SemanticMemoryFacade;
  /** Atomic-write helper: write + cache invalidate + audit log + SSE */
  safeWrite(
    filePath: string,
    data: string,
    encoding?: string,
    auditEntry?: {
      operation: string;
      entityType: string;
      entityId?: string;
      user?: string;
      summary?: string;
    }
  ): void;
}

/* ── Decision types ───────────────────────────────────────────── */

export interface DecisionCreateInput {
  type: 'question' | 'operational' | 'OPEN_QUESTION';
  priority: string;
  scope: string;
  text: string;
  notes?: string;
}

export interface DecisionMutateInput {
  action: 'answer' | 'decide' | 'defer' | 'expire' | 'reopen' | 'edit';
  id: string;
  answer?: string;
  reason?: string;
  priority?: string;
  scope?: string;
  text?: string;
  notes?: string;
}

export interface DecisionResult {
  ok: boolean;
  id: string;
  action: string;
  warnings?: string[];
}

export interface DecisionListResult {
  open: unknown[];
  decided: unknown[];
  deferred: unknown[];
  categories?: unknown[];
}

/* ── Questionnaire types ──────────────────────────────────────── */

export interface QuestionnaireUpdate {
  questionId: string;
  answer: string;
  status: string;
}

export interface QuestionnaireSummary {
  file: string;
  phase: string;
  title: string;
  total: number;
  answered: number;
  unanswered: number;
  deferred: number;
}

export interface SaveAnswersResult {
  saved: boolean;
  file: string;
  applied: number;
  total: number;
  warnings?: string[];
}

/* ── Command types ────────────────────────────────────────────── */

export interface CommandQueueEntry {
  command: string;
  text?: string;
  project?: string | null;
  scope?: string | null;
  description?: string | null;
  execution_mode?: 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID' | null;
  requested_at?: string;
  timestamp?: string;
  status: string;
  source?: string;
  clipboard_text?: string;
  brief_saved?: boolean;
  brief_path?: string;
}

export interface QueueCommandInput {
  command: string;
  project?: string;
  scope?: string;
  description?: string;
  brief?: string;
  execution_mode?: 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID';
}

export interface QueueCommandResult {
  ok: boolean;
  clipboard_text: string;
  brief_saved: boolean;
  warnings?: string[];
}

/* ── Governance types ─────────────────────────────────────────── */

export interface ApprovalItem {
  id: string;
  entity_id: string;
  gate_id: string;
  stage: string;
  requested_by: string;
  requested_at: string;
  required_role: string;
  status: string;
}

export interface CanonicalApprovalDecision {
  schema: 'approval-policy-decision';
  version: '1.0';
  decision: 'APPROVED' | 'REJECTED';
  approval_id: string;
  entity_id: string;
  gate_id: string;
  stage: string;
  decided_by: string;
  decided_at: string;
  reason: string;
}

export interface ApprovalDecisionResult {
  ok: boolean;
  approval: {
    id: string;
    status: string;
    decided_by: string;
    decided_at: string;
    reason: string;
  };
  decision: CanonicalApprovalDecision;
}

/* ── Session / progress types ─────────────────────────────────── */

export interface SessionState {
  session_id?: string;
  projectName?: string | null;
  mode?: string | null;
  execution_mode?: 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID' | null;
  execution_plan?: {
    mode?: string;
    selectedAgencyAgents?: Array<{ id?: string; name?: string }>;
    hybridInjections?: Array<{
      atState?: string;
      agents?: Array<{ id?: string; name?: string }>;
    }>;
  } | null;
  status?: string | null;
  cycle_type?: string | null;
  currentPhase?: string | null;
  current_phase?: string | null;
  currentAgent?: string | null;
  current_agent?: string | null;
  currentAgents?: string[];
  current_agents?: string[];
  current_step?: string | null;
  initiated_at?: string;
  last_updated?: string;
  phase_started_at?: string;
  phases?: unknown[];
  activeSprint?: unknown | null;
  completed_phases?: string[];
  completed_agents?: string[];
  phase_outputs?: Record<string, unknown>;
  sprint_backlog?: {
    sprint_statuses?: Record<string, unknown>;
    total_sprints?: number;
    path?: string;
  };
  blockers?: unknown[];
  open_human_escalations?: Array<{ status: string; [k: string]: unknown }>;
}

export interface RuntimeAlert {
  id: string;
  kind: 'timeout' | 'stall';
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
  next_action: string;
}

export interface ProgressInfo {
  projectName: string | null;
  mode: string | null;
  currentPhase: string | null;
  currentAgent: string | null;
  currentAgents?: string[];
  phases: unknown[];
  activeSprint: unknown | null;
}
