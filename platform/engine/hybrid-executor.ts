/**
 * Hybrid Executor — HYBRID execution mode (M4, Issue #1399)
 *
 * Injects agency specialists into SDLC phases with context-safe transitions.
 *
 * The SDLC pipeline continues to drive the main orchestration loop
 * (state machine, CRITIC gates, SYNTHESIS). At configured injection points
 * (any SDLC phase state), agency specialists may be invoked before the
 * SDLC phase's primary SDLC agent runs.
 *
 * Context-safety guarantees:
 *   - The injected agency agent always receives the current SDLC phase's
 *     predecessor outputs as context.
 *   - The agency agent's output is validated via the unified quality gate
 *     before the SDLC phase resumes.
 *   - If validation fails the injection is aborted and execution halts
 *     (escalationPolicy: 'block').
 *   - SDLC phase transitions are unaffected by agency injection failures
 *     only when escalationPolicy is 'log'.
 */

import type { ExecutionMode } from './execution-mode';
import { getExecutionModeDescriptor } from './execution-mode';
import type {
  AgencyAgent,
  AgencyInvocationResult,
  AgencyHandoffValidation,
} from './agency-executor';

// ─── Types ───────────────────────────────────────────────────

export interface HybridInjectionSpec {
  /**
   * SDLC state at which this injection fires.
   * e.g. 'PHASE_1', 'PHASE_2', 'PHASE_5_EXECUTING'
   */
  atState: string;
  /** Agency agents to invoke (in order) at this injection point. */
  agents: AgencyAgent[];
}

export interface HybridPhaseContext {
  /** The SDLC state currently executing. */
  sdlcState: string;
  /** Outputs from all predecessor SDLC states, keyed by state name. */
  sdlcPredecessorOutputs: Record<string, string>;
  /** All agency agent outputs accumulated so far, keyed by agent id. */
  agencyOutputs: Record<string, string>;
}

export interface HybridInvocationResult extends AgencyInvocationResult {
  agentId: string;
  agentName: string;
}

export interface HybridInjectionStep {
  atState: string;
  agentId: string;
  agentName: string;
  status: 'completed' | 'failed' | 'skipped';
  deliverable?: string;
  violations: string[];
  durationMs: number;
  error?: string;
}

export interface HybridExecutionResult {
  mode: ExecutionMode;
  status: 'completed' | 'failed';
  injectionSteps: HybridInjectionStep[];
  /** Accumulated agency outputs from all injection points. */
  agencyOutputs: Record<string, string>;
  totalInjectionDurationMs: number;
  failedAtState?: string;
  failedAgentId?: string;
  failureReason?: string;
}

export interface HybridExecutorOptions {
  /** All injection specs defining which agents fire at which SDLC states. */
  injections: HybridInjectionSpec[];
  /**
   * Agency agent invocation function.
   * Receives the agent descriptor and the current hybrid phase context.
   */
  invokeAgent: (agent: AgencyAgent, context: HybridPhaseContext) => Promise<HybridInvocationResult>;
  /**
   * Optional handoff validator. When omitted, the built-in checklist
   * validator from agency-executor is used via validateHybridHandoff below.
   */
  validateHandoff?: (deliverable: string, agentId: string) => AgencyHandoffValidation;
  /** Optional callback after each injection step. */
  onInjectionComplete?: (step: HybridInjectionStep) => void;
}

// ─── Built-in handoff validator ───────────────────────────────

const HANDOFF_CHECKLIST_MARKER = '## HANDOFF CHECKLIST';

function validateHybridHandoff(deliverable: string, agentId: string): AgencyHandoffValidation {
  const violations: string[] = [];

  if (!deliverable || deliverable.trim().length === 0) {
    violations.push(`Agent ${agentId}: deliverable is empty`);
    return { passed: false, violations };
  }

  if (!deliverable.includes(HANDOFF_CHECKLIST_MARKER)) {
    violations.push(`Agent ${agentId}: missing HANDOFF CHECKLIST section`);
  }

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

// ─── Hybrid Executor ─────────────────────────────────────────

/**
 * HybridExecutor manages agency injection across SDLC phase boundaries.
 *
 * Usage pattern:
 *   1. Create an executor with injection specs.
 *   2. Before each SDLC state executes, call `runInjection(sdlcState, context)`.
 *   3. If the result is `status: 'failed'`, abort the SDLC pipeline.
 *   4. If `status: 'completed'`, the SDLC phase continues normally.
 *      The injected agency outputs are available via `result.agencyOutputs`.
 */
export class HybridExecutor {
  private readonly _options: HybridExecutorOptions;
  private readonly _agencyOutputs: Record<string, string> = {};
  private readonly _injectionSteps: HybridInjectionStep[] = [];
  private readonly _escalationPolicy: 'block' | 'log' | 'retry';

  constructor(options: HybridExecutorOptions) {
    this._options = options;
    this._escalationPolicy = getExecutionModeDescriptor('HYBRID').escalationPolicy;
  }

  /**
   * Run all agency injection agents configured for the given SDLC state.
   * Must be called before the SDLC phase agent runs.
   *
   * Returns a summary result. If `status === 'failed'` and the escalation
   * policy is 'block', the caller must abort the SDLC pipeline.
   */
  async runInjection(
    sdlcState: string,
    sdlcPredecessorOutputs: Record<string, string>
  ): Promise<HybridExecutionResult> {
    const relevantInjections = this._options.injections.filter((inj) => inj.atState === sdlcState);

    if (relevantInjections.length === 0) {
      return {
        mode: 'HYBRID',
        status: 'completed',
        injectionSteps: [],
        agencyOutputs: { ...this._agencyOutputs },
        totalInjectionDurationMs: 0,
      };
    }

    const overallStart = Date.now();
    const validateHandoff = this._options.validateHandoff ?? validateHybridHandoff;

    for (const injection of relevantInjections) {
      for (const agent of injection.agents) {
        const stepStart = Date.now();
        const context: HybridPhaseContext = {
          sdlcState,
          sdlcPredecessorOutputs: { ...sdlcPredecessorOutputs },
          agencyOutputs: { ...this._agencyOutputs },
        };

        let invocationResult: HybridInvocationResult;
        try {
          invocationResult = await this._options.invokeAgent(agent, context);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          const step: HybridInjectionStep = {
            atState: sdlcState,
            agentId: agent.id,
            agentName: agent.name,
            status: 'failed',
            violations: [],
            durationMs: Date.now() - stepStart,
            error: `Invocation threw: ${message}`,
          };
          this._injectionSteps.push(step);
          this._options.onInjectionComplete?.(step);

          if (this._escalationPolicy === 'block') {
            return {
              mode: 'HYBRID',
              status: 'failed',
              injectionSteps: [...this._injectionSteps],
              agencyOutputs: { ...this._agencyOutputs },
              totalInjectionDurationMs: Date.now() - overallStart,
              failedAtState: sdlcState,
              failedAgentId: agent.id,
              failureReason: step.error,
            };
          }
          continue;
        }

        if (!invocationResult.success || invocationResult.deliverable === undefined) {
          const step: HybridInjectionStep = {
            atState: sdlcState,
            agentId: agent.id,
            agentName: agent.name,
            status: 'failed',
            violations: [],
            durationMs: Date.now() - stepStart,
            error: invocationResult.error ?? `Agent ${agent.id} returned no deliverable`,
          };
          this._injectionSteps.push(step);
          this._options.onInjectionComplete?.(step);

          if (this._escalationPolicy === 'block') {
            return {
              mode: 'HYBRID',
              status: 'failed',
              injectionSteps: [...this._injectionSteps],
              agencyOutputs: { ...this._agencyOutputs },
              totalInjectionDurationMs: Date.now() - overallStart,
              failedAtState: sdlcState,
              failedAgentId: agent.id,
              failureReason: step.error,
            };
          }
          continue;
        }

        const deliverable = invocationResult.deliverable;
        const validation = validateHandoff(deliverable, agent.id);

        if (!validation.passed && this._escalationPolicy === 'block') {
          const step: HybridInjectionStep = {
            atState: sdlcState,
            agentId: agent.id,
            agentName: agent.name,
            status: 'failed',
            deliverable,
            violations: validation.violations,
            durationMs: Date.now() - stepStart,
            error: `Handoff validation failed: ${validation.violations.join('; ')}`,
          };
          this._injectionSteps.push(step);
          this._options.onInjectionComplete?.(step);

          return {
            mode: 'HYBRID',
            status: 'failed',
            injectionSteps: [...this._injectionSteps],
            agencyOutputs: { ...this._agencyOutputs },
            totalInjectionDurationMs: Date.now() - overallStart,
            failedAtState: sdlcState,
            failedAgentId: agent.id,
            failureReason: step.error,
          };
        }

        // ── Success ──────────────────────────────────────
        this._agencyOutputs[agent.id] = deliverable;
        const step: HybridInjectionStep = {
          atState: sdlcState,
          agentId: agent.id,
          agentName: agent.name,
          status: 'completed',
          deliverable,
          violations: validation.violations,
          durationMs: Date.now() - stepStart,
        };
        this._injectionSteps.push(step);
        this._options.onInjectionComplete?.(step);
      }
    }

    return {
      mode: 'HYBRID',
      status: 'completed',
      injectionSteps: [...this._injectionSteps],
      agencyOutputs: { ...this._agencyOutputs },
      totalInjectionDurationMs: Date.now() - overallStart,
    };
  }

  /** All agency outputs accumulated across all injection points so far. */
  get agencyOutputs(): Readonly<Record<string, string>> {
    return this._agencyOutputs;
  }

  /** All injection steps recorded so far. */
  get injectionSteps(): ReadonlyArray<HybridInjectionStep> {
    return this._injectionSteps;
  }
}

/**
 * Factory helper: create a HybridExecutor from an options object.
 */
export function createHybridExecutor(options: HybridExecutorOptions): HybridExecutor {
  return new HybridExecutor(options);
}
