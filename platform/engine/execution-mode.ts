/**
 * Execution Mode Definitions (M4: Hybrid SDLC + Agency Execution Model)
 *
 * Defines the three top-level execution modes for the orchestrator:
 *   - SDLC_ONLY:    Pure SDLC phase pipeline (existing behaviour, no agency injection)
 *   - AGENCY_ONLY:  Pure agency team execution, bypasses SDLC phases
 *   - HYBRID:       SDLC phases with agency specialist injection at defined injection points
 *
 * Decision matrix and handoff expectations per mode are captured in
 * EXECUTION_MODE_DESCRIPTORS below.
 *
 * Issue: #1396
 */

// ─── Types ───────────────────────────────────────────────────

/** The three supported orchestrator execution modes (M4). */
export type ExecutionMode = 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID';

export const VALID_EXECUTION_MODES: ReadonlyArray<ExecutionMode> = Object.freeze([
  'SDLC_ONLY',
  'AGENCY_ONLY',
  'HYBRID',
]);

// ─── Handoff Expectations ─────────────────────────────────────

export interface HandoffExpectations {
  /** Deliverable must include a completed HANDOFF CHECKLIST. */
  requireHandoffChecklist: boolean;
  /** Minimum ratio of checked items in the handoff checklist (0–1). */
  minChecklistCompletionRatio: number;
  /** Deliverable must cite a source for every finding. */
  requireSourceCitations: boolean;
  /** UNCERTAIN: tags must be documented and escalated. */
  requireUncertaintyDocumentation: boolean;
}

// ─── Injection Points (HYBRID mode) ──────────────────────────

export interface AgencyInjectionPoint {
  /** SDLC state where agency specialists may be injected. */
  atState: string;
  /** Optional: specific agent IDs that are eligible for injection. */
  eligibleAgentIds?: string[];
  /** Whether injection at this point is mandatory or opportunistic. */
  mandatory: boolean;
}

// ─── Mode Descriptor ─────────────────────────────────────────

export interface ExecutionModeDescriptor {
  mode: ExecutionMode;
  label: string;
  description: string;
  /**
   * Whether this mode runs SDLC phases (PHASE_1 through PHASE_4 and their
   * associated CRITIC gates).
   */
  usesSdlcPhases: boolean;
  /**
   * Whether this mode assembles and dispatches agency team agents directly,
   * outside the SDLC phase model.
   */
  usesAgencyTeam: boolean;
  /**
   * HYBRID only: ordered list of SDLC states at which agency specialists
   * may be injected.
   */
  injectionPoints: AgencyInjectionPoint[];
  handoffExpectations: HandoffExpectations;
  /**
   * Escalation behaviour when a handoff validation fails.
   *   'block'   — stop execution, surface error to operator
   *   'log'     — record violation and continue
   *   'retry'   — re-invoke the failing agent (up to max retries)
   */
  escalationPolicy: 'block' | 'log' | 'retry';
}

// ─── Decision Matrix ─────────────────────────────────────────

/**
 * Decision matrix: which mode to use given project characteristics.
 *
 * Rows represent decision factors; columns represent mode recommendations.
 */
export interface DecisionMatrixRow {
  factor: string;
  sdlcOnly: string;
  agencyOnly: string;
  hybrid: string;
}

export const EXECUTION_MODE_DECISION_MATRIX: ReadonlyArray<DecisionMatrixRow> = Object.freeze([
  {
    factor: 'Standard product delivery (feature → release)',
    sdlcOnly: 'RECOMMENDED',
    agencyOnly: 'NOT RECOMMENDED',
    hybrid: 'OPTIONAL',
  },
  {
    factor: 'Creative / open-ended tasks (design, brainstorm, research)',
    sdlcOnly: 'NOT RECOMMENDED',
    agencyOnly: 'RECOMMENDED',
    hybrid: 'OPTIONAL',
  },
  {
    factor: 'Regulated domains requiring audit trail (PHASE gates)',
    sdlcOnly: 'RECOMMENDED',
    agencyOnly: 'NOT SUPPORTED',
    hybrid: 'RECOMMENDED',
  },
  {
    factor: 'Discovery phase with unknown requirements',
    sdlcOnly: 'NOT RECOMMENDED',
    agencyOnly: 'RECOMMENDED',
    hybrid: 'RECOMMENDED',
  },
  {
    factor: 'HOTFIX / emergency bypass',
    sdlcOnly: 'NOT RECOMMENDED (use HOTFIX command)',
    agencyOnly: 'NOT RECOMMENDED',
    hybrid: 'NOT RECOMMENDED',
  },
  {
    factor: 'Multi-domain project needing specialist injection',
    sdlcOnly: 'NOT RECOMMENDED',
    agencyOnly: 'OPTIONAL',
    hybrid: 'RECOMMENDED',
  },
  {
    factor: 'Existing SDLC projects adding agency intelligence',
    sdlcOnly: 'NOT RECOMMENDED',
    agencyOnly: 'NOT RECOMMENDED',
    hybrid: 'RECOMMENDED',
  },
]);

// ─── Mode Descriptors ─────────────────────────────────────────

const SDLC_HANDOFF_EXPECTATIONS: HandoffExpectations = Object.freeze({
  requireHandoffChecklist: true,
  minChecklistCompletionRatio: 1.0,
  requireSourceCitations: true,
  requireUncertaintyDocumentation: true,
});

const AGENCY_HANDOFF_EXPECTATIONS: HandoffExpectations = Object.freeze({
  requireHandoffChecklist: true,
  minChecklistCompletionRatio: 1.0,
  requireSourceCitations: true,
  requireUncertaintyDocumentation: true,
});

/**
 * All available SDLC states where agency injection is supported in HYBRID mode.
 * Injection is always optional (mandatory: false) to preserve backward compatibility.
 */
const HYBRID_INJECTION_POINTS: ReadonlyArray<AgencyInjectionPoint> = Object.freeze([
  { atState: 'PHASE_1', mandatory: false },
  { atState: 'PHASE_2', mandatory: false },
  { atState: 'PHASE_3', mandatory: false },
  { atState: 'PHASE_4', mandatory: false },
  { atState: 'PHASE_5_EXECUTING', mandatory: false },
]);

export const EXECUTION_MODE_DESCRIPTORS: Readonly<Record<ExecutionMode, ExecutionModeDescriptor>> =
  Object.freeze({
    SDLC_ONLY: {
      mode: 'SDLC_ONLY',
      label: 'SDLC Only',
      description:
        'Pure SDLC phase pipeline. Runs PHASE_1 through PHASE_4 (per selected command mode) ' +
        'with CRITIC gates and SYNTHESIS. No agency team agents are injected. ' +
        'This is the default mode and preserves all existing orchestrator behaviour.',
      usesSdlcPhases: true,
      usesAgencyTeam: false,
      injectionPoints: [],
      handoffExpectations: SDLC_HANDOFF_EXPECTATIONS,
      escalationPolicy: 'block',
    },

    AGENCY_ONLY: {
      mode: 'AGENCY_ONLY',
      label: 'Agency Only',
      description:
        'Pure agency team execution. Bypasses all SDLC PHASE/CRITIC states and runs an ' +
        'assembled set of agency specialists directly. Handoff validation and escalation ' +
        'are enforced between each agency agent transition. Suitable for creative, ' +
        'discovery, or open-ended tasks that do not map to SDLC phases.',
      usesSdlcPhases: false,
      usesAgencyTeam: true,
      injectionPoints: [],
      handoffExpectations: AGENCY_HANDOFF_EXPECTATIONS,
      escalationPolicy: 'block',
    },

    HYBRID: {
      mode: 'HYBRID',
      label: 'Hybrid SDLC + Agency',
      description:
        'Mixed execution: SDLC phases run as normal but agency specialists may be injected ' +
        'at any SDLC phase boundary. Injection is context-safe — the injected agency agent ' +
        'receives the predecessor SDLC output as context and its output is validated before ' +
        'the SDLC pipeline resumes. Provides the best of both models for multi-domain projects.',
      usesSdlcPhases: true,
      usesAgencyTeam: true,
      injectionPoints: [...HYBRID_INJECTION_POINTS],
      handoffExpectations: SDLC_HANDOFF_EXPECTATIONS,
      escalationPolicy: 'block',
    },
  });

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Validate that a string is a recognised ExecutionMode.
 * Returns the mode if valid, throws otherwise.
 */
export function assertExecutionMode(value: unknown): ExecutionMode {
  if (typeof value !== 'string') {
    throw new Error(
      `Invalid executionMode: expected a string, got ${typeof value}. ` +
        `Valid values: ${VALID_EXECUTION_MODES.join(', ')}.`
    );
  }
  if (!VALID_EXECUTION_MODES.includes(value as ExecutionMode)) {
    throw new Error(
      `Invalid executionMode "${value}". Valid values: ${VALID_EXECUTION_MODES.join(', ')}.`
    );
  }
  return value as ExecutionMode;
}

/**
 * Resolve an executionMode from a raw input, defaulting to SDLC_ONLY when
 * the value is undefined or null.
 */
export function resolveExecutionMode(value: unknown): ExecutionMode {
  if (value === undefined || value === null || value === '') {
    return 'SDLC_ONLY';
  }
  return assertExecutionMode(value);
}

/**
 * Return the descriptor for a given execution mode.
 */
export function getExecutionModeDescriptor(mode: ExecutionMode): ExecutionModeDescriptor {
  return EXECUTION_MODE_DESCRIPTORS[mode];
}
