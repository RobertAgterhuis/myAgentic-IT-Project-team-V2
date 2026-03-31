/**
 * Agency Executor — AGENCY_ONLY execution mode (M4, Issue #1398)
 *
 * Orchestrates a pure-agency team execution pipeline:
 *   1. Accepts an ordered list of agency agents (assembled externally or via registry)
 *   2. Dispatches each agent in sequence, injecting predecessor outputs as context
 *   3. Validates each agent's handoff deliverable before proceeding to the next
 *   4. Escalates and halts on validation failure (configurable policy)
 *
 * This module does NOT depend on SDLC state-machine states. It is purely
 * a sequential agent runner with handoff-contract enforcement.
 */

import type { ExecutionMode } from './execution-mode';
import { getExecutionModeDescriptor } from './execution-mode';

// ─── Types ───────────────────────────────────────────────────

export interface AgencyAgent {
  /** Unique agent identifier (matches registry / agents.json id). */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Path to the agent's skill file (markdown instructions). */
  skillFile?: string;
}

export interface AgencyExecutionOptions {
  /** Ordered list of agency agents to execute. */
  agents: AgencyAgent[];
  /** Predecessor context to inject into the first agent. */
  initialContext?: Record<string, string>;
  /** Maximum retries per agent on transient failures. */
  maxRetries?: number;
  /**
   * Agent invocation function. Must return the agent's deliverable as a string.
   * Implementations may delegate to a platform adapter (Copilot, Claude, etc.)
   */
  invokeAgent: (agent: AgencyAgent, context: AgencyRunContext) => Promise<AgencyInvocationResult>;
  /**
   * Handoff validator function. Returns validation outcome.
   * If not provided, only the checklist presence check is applied.
   */
  validateHandoff?: (deliverable: string, agentId: string) => AgencyHandoffValidation;
  /** Optional progress callback after each agent completes. */
  onAgentComplete?: (step: AgencyStep) => void;
}

export interface AgencyRunContext {
  agentId: string;
  agentName: string;
  /**
   * Outputs from all previously completed agents, keyed by agent id.
   */
  predecessorOutputs: Record<string, string>;
  /** Zero-based position of this agent in the execution sequence. */
  stepIndex: number;
}

export interface AgencyInvocationResult {
  success: boolean;
  deliverable?: string;
  error?: string;
}

export interface AgencyHandoffValidation {
  passed: boolean;
  violations: string[];
}

export interface AgencyStep {
  stepIndex: number;
  agentId: string;
  agentName: string;
  status: 'completed' | 'failed' | 'skipped';
  deliverable?: string;
  violations: string[];
  attempts: number;
  durationMs: number;
  error?: string;
}

export interface AgencyExecutionResult {
  mode: ExecutionMode;
  status: 'completed' | 'failed' | 'partial';
  steps: AgencyStep[];
  /** Merged map of all agent outputs, keyed by agent id. */
  outputs: Record<string, string>;
  totalDurationMs: number;
  failedAtStep?: number;
  failureReason?: string;
}

// ─── Handoff Checklist Validator ──────────────────────────────

const HANDOFF_CHECKLIST_MARKER = '## HANDOFF CHECKLIST';

function defaultValidateHandoff(deliverable: string, agentId: string): AgencyHandoffValidation {
  const violations: string[] = [];

  if (!deliverable || deliverable.trim().length === 0) {
    violations.push(`Agent ${agentId}: deliverable is empty`);
    return { passed: false, violations };
  }

  if (!deliverable.includes(HANDOFF_CHECKLIST_MARKER)) {
    violations.push(`Agent ${agentId}: missing HANDOFF CHECKLIST section`);
  }

  // Count checked vs total checklist items
  const checklistStart = deliverable.indexOf(HANDOFF_CHECKLIST_MARKER);
  if (checklistStart !== -1) {
    const checklistSection = deliverable.slice(checklistStart);
    const totalItems = (checklistSection.match(/^- \[[ x]\]/gm) || []).length;
    const checkedItems = (checklistSection.match(/^- \[x\]/gm) || []).length;

    if (totalItems === 0) {
      violations.push(`Agent ${agentId}: HANDOFF CHECKLIST contains no items`);
    } else if (checkedItems < totalItems) {
      violations.push(
        `Agent ${agentId}: HANDOFF CHECKLIST incomplete — ${checkedItems}/${totalItems} items checked`
      );
    }
  }

  return { passed: violations.length === 0, violations };
}

// ─── Agency Executor ─────────────────────────────────────────

/**
 * Run a pure-agency team execution pipeline (AGENCY_ONLY mode).
 *
 * Agents are executed in the order provided. Each agent receives the
 * predecessor outputs as context. If a handoff validation fails, execution
 * halts and the result carries the failure details (escalationPolicy: 'block').
 */
export async function runAgencyExecution(
  options: AgencyExecutionOptions
): Promise<AgencyExecutionResult> {
  const {
    agents,
    initialContext = {},
    maxRetries = 1,
    invokeAgent,
    validateHandoff = defaultValidateHandoff,
    onAgentComplete,
  } = options;

  const descriptor = getExecutionModeDescriptor('AGENCY_ONLY');
  const escalationPolicy = descriptor.escalationPolicy;

  const steps: AgencyStep[] = [];
  const outputs: Record<string, string> = { ...initialContext };
  const executionStart = Date.now();

  for (let i = 0; i < agents.length; i++) {
    const agent = agents[i];
    const stepStart = Date.now();
    let attempts = 0;
    let lastError: string | undefined;
    let deliverable: string | undefined;
    let invocationSuccess = false;

    // ── Retry loop ──────────────────────────────────────────
    while (attempts <= maxRetries) {
      attempts++;
      const context: AgencyRunContext = {
        agentId: agent.id,
        agentName: agent.name,
        predecessorOutputs: { ...outputs },
        stepIndex: i,
      };

      const result = await invokeAgent(agent, context);

      if (result.success && result.deliverable !== undefined) {
        deliverable = result.deliverable;
        invocationSuccess = true;
        break;
      }

      lastError = result.error ?? `Agent ${agent.id} invocation failed (attempt ${attempts})`;

      if (attempts > maxRetries) break;
    }

    // ── Handle invocation failure ─────────────────────────
    if (!invocationSuccess || deliverable === undefined) {
      const step: AgencyStep = {
        stepIndex: i,
        agentId: agent.id,
        agentName: agent.name,
        status: 'failed',
        violations: [],
        attempts,
        durationMs: Date.now() - stepStart,
        error: lastError,
      };
      steps.push(step);
      onAgentComplete?.(step);

      return {
        mode: 'AGENCY_ONLY',
        status: 'failed',
        steps,
        outputs,
        totalDurationMs: Date.now() - executionStart,
        failedAtStep: i,
        failureReason: lastError,
      };
    }

    // ── Validate handoff ─────────────────────────────────
    const validation = validateHandoff(deliverable, agent.id);

    if (!validation.passed && escalationPolicy === 'block') {
      const step: AgencyStep = {
        stepIndex: i,
        agentId: agent.id,
        agentName: agent.name,
        status: 'failed',
        deliverable,
        violations: validation.violations,
        attempts,
        durationMs: Date.now() - stepStart,
        error: `Handoff validation failed: ${validation.violations.join('; ')}`,
      };
      steps.push(step);
      onAgentComplete?.(step);

      return {
        mode: 'AGENCY_ONLY',
        status: 'failed',
        steps,
        outputs,
        totalDurationMs: Date.now() - executionStart,
        failedAtStep: i,
        failureReason: step.error,
      };
    }

    // ── Success ───────────────────────────────────────────
    outputs[agent.id] = deliverable;
    const step: AgencyStep = {
      stepIndex: i,
      agentId: agent.id,
      agentName: agent.name,
      status: 'completed',
      deliverable,
      violations: validation.violations,
      attempts,
      durationMs: Date.now() - stepStart,
    };
    steps.push(step);
    onAgentComplete?.(step);
  }

  return {
    mode: 'AGENCY_ONLY',
    status: 'completed',
    steps,
    outputs,
    totalDurationMs: Date.now() - executionStart,
  };
}
