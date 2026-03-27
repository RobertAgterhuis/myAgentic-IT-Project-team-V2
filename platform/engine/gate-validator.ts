/**
 * Gate Validator — Critic + Risk validation engine (FEAT-05-C)
 *
 * Validates agent deliverables against contracts and guardrails
 * before allowing state transitions through critic gates.
 *
 * Checks:
 *   - Contract compliance: required sections present, not empty/placeholder
 *   - Anti-hallucination: UNCERTAIN: and INSUFFICIENT_DATA: properly documented
 *   - Guardrail compliance: rules loaded and violations tracked
 *   - Handoff checklist: all 9 items present and checked
 *   - Questionnaire extraction: QUESTIONNAIRE_REQUEST items collected
 *   - Governance advisory: policy compliance report (M4, when mode != 'off')
 *
 * @module orchestrator/gate-validator
 */

import path from 'path';
import { matchPolicies, type GovernancePoliciesConfig } from './governance-config';
import { type ResolvedIdentity } from './identity';

interface GateStore {
  exists(path: string): boolean;
  readFile(path: string): string;
}

// ─── Constants ───────────────────────────────────────────────

const CONTRACTS_DIR = 'templates/sdlc/contracts';
const GUARDRAILS_DIR = 'templates/sdlc/guardrails';

/** Maps CRITIC states to the phase they validate */
const CRITIC_TO_PHASE = {
  CRITIC_1: 'PHASE_1',
  CRITIC_2: 'PHASE_2',
  CRITIC_3: 'PHASE_3',
  CRITIC_4: 'PHASE_4',
};

/** Maps phases to applicable guardrail files */
const PHASE_GUARDRAILS = {
  PHASE_1: ['00-global-guardrails.md', '01-business-guardrails.md'],
  PHASE_2: [
    '00-global-guardrails.md',
    '02-architecture-guardrails.md',
    '03-security-guardrails.md',
  ],
  PHASE_3: ['00-global-guardrails.md', '04-ux-guardrails.md', '08-content-guardrails.md'],
  PHASE_4: ['00-global-guardrails.md', '05-marketing-guardrails.md'],
};

/** Maps phases to applicable contract files */
const PHASE_CONTRACTS = {
  PHASE_1: [
    'analysis-output-contract.md',
    'recommendations-output-contract.md',
    'sprintplan-output-contract.md',
    'guardrails-output-contract.md',
  ],
  PHASE_2: [
    'analysis-output-contract.md',
    'recommendations-output-contract.md',
    'sprintplan-output-contract.md',
    'guardrails-output-contract.md',
  ],
  PHASE_3: [
    'analysis-output-contract.md',
    'recommendations-output-contract.md',
    'sprintplan-output-contract.md',
    'guardrails-output-contract.md',
  ],
  PHASE_4: [
    'analysis-output-contract.md',
    'recommendations-output-contract.md',
    'sprintplan-output-contract.md',
    'guardrails-output-contract.md',
  ],
};

/** Placeholder patterns banned by G-GLOB-17 */
const PLACEHOLDER_PATTERNS = [
  /\[TODO\]/i,
  /\[FILL\s+IN/i,
  /\[SEE\s+BELOW\]/i,
  /\[TBD\]/i,
  /\[PLACEHOLDER\]/i,
  /\[INSERT\s/i,
];

/** Tags tracked during validation */
const TRACKED_TAGS = [
  'UNCERTAIN:',
  'INSUFFICIENT_DATA:',
  'QUESTIONNAIRE_REQUEST',
  'GUARDRAIL_VIOLATION:',
  'SECURITY_FLAG:',
  'OUT_OF_SCOPE:',
  'SOURCE_CLASSIFICATION:',
];

/** Minimum number of canonical handoff checklist items (G-GLOB-20) */
const HANDOFF_CHECKLIST_COUNT = 9;

/** Executable phase exit criteria IDs for critic gates (E-B1 / #692). */
const PHASE_EXIT_CRITERIA = [
  {
    id: 'B1-GATE-001',
    title: 'No critical violations',
    description: 'Critical quality violations must be zero before phase transition.',
    blocking: true,
  },
  {
    id: 'B1-GATE-002',
    title: 'No major violations',
    description: 'Major quality violations must be zero before phase transition.',
    blocking: false,
  },
  {
    id: 'B1-GATE-003',
    title: 'Handoff checklists complete',
    description: 'Every deliverable must include a complete handoff checklist.',
    blocking: true,
  },
] as const;

// ─── Parsing Functions ───────────────────────────────────────

/**
 * Extract markdown heading sections from content.
 * @param {string} markdown
 * @returns {Array<{level: number, title: string, content: string}>}
 */
function extractSections(markdown: string) {
  const lines = markdown.split('\n');
  const sections: Array<{ level: number; title: string; content: string }> = [];
  let current: { level: number; title: string; content: string } | null = null;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (current) {
        current.content = current.content.trim();
        sections.push(current);
      }
      current = { level: match[1].length, title: match[2].trim(), content: '' };
    } else if (current) {
      current.content += line + '\n';
    }
  }
  if (current) {
    current.content = current.content.trim();
    sections.push(current);
  }
  return sections;
}

/**
 * Find placeholder text patterns in content (G-GLOB-17).
 * @param {string} content
 * @returns {Array<{line: number, text: string, pattern: string}>}
 */
function findPlaceholders(content: string) {
  const found: Array<{ line: number; text: string; pattern: string }> = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(lines[i])) {
        found.push({ line: i + 1, text: lines[i].trim(), pattern: pattern.source });
        break;
      }
    }
  }
  return found;
}

/**
 * Extract items with a specific tag prefix from content.
 * @param {string} content
 * @param {string} tag - e.g. 'UNCERTAIN:', 'INSUFFICIENT_DATA:'
 * @returns {Array<{line: number, tag: string, text: string, fullLine: string}>}
 */
function extractTaggedItems(content: string, tag: string) {
  const items: Array<{ line: number; tag: string; text: string; fullLine: string }> = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf(tag);
    if (idx >= 0) {
      items.push({
        line: i + 1,
        tag,
        text: lines[i].substring(idx + tag.length).trim(),
        fullLine: lines[i].trim(),
      });
    }
  }
  return items;
}

/**
 * Parse the handoff checklist from a markdown document.
 * Looks for `## HANDOFF CHECKLIST` heading and counts checked/unchecked items.
 * @param {string} content
 * @returns {{found: boolean, checked: number, unchecked: number, total: number, items: Array}}
 */
function parseHandoffChecklist(content: string) {
  const checklistMatch = content.match(/##\s*HANDOFF\s+CHECKLIST/i);
  if (!checklistMatch) {
    return { found: false, checked: 0, unchecked: 0, total: 0, items: [] };
  }

  const checklistIndex = checklistMatch.index ?? 0;
  const afterChecklist = content.substring(checklistIndex + checklistMatch[0].length);

  // Bound by next same-or-higher-level heading
  const nextHeading = afterChecklist.match(/\n#{1,2}\s+(?!#)/);
  const checklistContent = nextHeading
    ? afterChecklist.substring(0, nextHeading.index)
    : afterChecklist;

  const items: Array<{ text: string; checked: boolean }> = [];
  const lines = checklistContent.split('\n');
  for (const line of lines) {
    const checkedMatch = line.match(/^\s*-\s*\[x\]\s*(.+)/i);
    const uncheckedMatch = line.match(/^\s*-\s*\[\s*\]\s*(.+)/);
    if (checkedMatch) items.push({ text: checkedMatch[1].trim(), checked: true });
    else if (uncheckedMatch) items.push({ text: uncheckedMatch[1].trim(), checked: false });
  }

  return {
    found: true,
    checked: items.filter((i) => i.checked).length,
    unchecked: items.filter((i) => !i.checked).length,
    total: items.length,
    items,
  };
}

/**
 * Load required section titles from a contract markdown file.
 * Extracts headings under "MANDATORY SECTIONS" or "MANDATORY SCHEMA".
 * @param {object} store
 * @param {string} contractPath
 * @returns {string[]} List of required section titles
 */
function loadContractSections(store: GateStore, contractPath: string) {
  if (!store.exists(contractPath)) return [];
  const content = store.readFile(contractPath);
  const sections: string[] = [];

  const mandatoryMatch = content.match(/##\s*MANDATORY\s+(SECTIONS|SCHEMA)/i);
  if (!mandatoryMatch) return [];

  const mandatoryIndex = mandatoryMatch.index ?? 0;
  const afterMandatory = content.substring(mandatoryIndex);
  const lines = afterMandatory.split('\n');

  for (let i = 1; i < lines.length; i++) {
    // Stop at a new top-level section that isn't part of mandatory
    if (/^##\s+[^#]/.test(lines[i]) && !/MANDATORY/i.test(lines[i])) break;
    const heading = lines[i].match(/^###\s+\d+\.\s+(.+)/);
    if (heading) sections.push(heading[1].trim());
  }
  return sections;
}

/**
 * Load guardrail rule IDs from a guardrail file.
 * @param {object} store
 * @param {string} guardrailPath
 * @returns {string[]} List of rule IDs (e.g. 'G-GLOB-01')
 */
function loadGuardrailRules(store: GateStore, guardrailPath: string) {
  if (!store.exists(guardrailPath)) return [];
  const content = store.readFile(guardrailPath);
  const rules = new Set<string>();
  // Pattern 1: heading format — ### G-XXX-NN
  for (const m of content.matchAll(/###\s+(G-[A-Z]+-\d+)/g)) {
    rules.add(m[1]);
  }
  // Pattern 2: table row format — | G-XXX-NN |
  for (const m of content.matchAll(/\|\s*(G-[A-Z]+-\d+)\s*\|/g)) {
    rules.add(m[1]);
  }
  return [...rules];
}

// ─── Document Validation ─────────────────────────────────────

/**
 * Validate a single deliverable document against quality checks.
 *
 * @param {string} content - Markdown content of the deliverable
 * @param {object} [options]
 * @param {string[]} [options.requiredSections] - Contract section titles to verify
 * @returns {{violations: Array, tags: object, handoff: object}}
 */
function validateDocument(content: string, options: { requiredSections?: string[] } = {}) {
  const violations: Array<Record<string, unknown>> = [];
  const { requiredSections = [] } = options;

  if (!content || !content.trim()) {
    violations.push({
      severity: 'CRITICAL',
      rule: 'EMPTY_DELIVERABLE',
      description: 'Deliverable is empty or contains only whitespace',
    });
    return {
      violations,
      tags: {},
      handoff: { found: false, checked: 0, unchecked: 0, total: 0, items: [] },
    };
  }

  // AC-2: Check required sections (not empty, not placeholder)
  const sections = extractSections(content);
  if (requiredSections.length > 0) {
    const sectionTitles = sections.map((s) => s.title.toLowerCase());
    for (const required of requiredSections) {
      const found = sectionTitles.some((t) => t.includes(required.toLowerCase()));
      if (!found) {
        violations.push({
          severity: 'MAJOR',
          rule: 'MISSING_SECTION',
          description: `Required section missing: "${required}"`,
        });
      }
    }
  }

  // Check for empty sections
  for (const section of sections) {
    if (!section.content.trim()) {
      violations.push({
        severity: 'MAJOR',
        rule: 'EMPTY_SECTION',
        description: `Section "${section.title}" is empty`,
      });
    }
  }

  // AC-2: Check placeholder text (G-GLOB-17)
  const placeholders = findPlaceholders(content);
  for (const ph of placeholders) {
    violations.push({
      severity: 'MAJOR',
      rule: 'PLACEHOLDER_TEXT',
      description: `Placeholder text at line ${ph.line}: "${ph.text}"`,
    });
  }

  // AC-3: Extract tagged items
  const tags: Record<
    string,
    Array<{ line: number; tag: string; text: string; fullLine: string }>
  > = {};
  for (const tag of TRACKED_TAGS) {
    tags[tag] = extractTaggedItems(content, tag);
  }

  // B2.1/B2.2: Enforce retrieval policy against deterministic decision manipulation.
  const lines = content.split('\n');
  const headingByLine: Record<number, string> = {};
  let activeHeading = 'Document Root';
  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      activeHeading = headingMatch[2].trim();
    }
    headingByLine[i + 1] = activeHeading;
  }

  const deterministicDecisionPatterns = [
    /\bgate\s+decision\b/i,
    /\bstate\s+transition\b/i,
    /\bverdict\s*:\s*(APPROVED|FAILED|PENDING_APPROVAL)\b/i,
    /\bpolicy\s+override\b/i,
    /\bapproval\s+granted\b/i,
  ];

  for (const sourceTag of tags['SOURCE_CLASSIFICATION:'] || []) {
    const classification = sourceTag.text.toLowerCase();
    if (classification !== 'untrusted' && classification !== 'mixed') {
      continue;
    }

    const windowLines = lines.slice(sourceTag.line - 1, Math.min(lines.length, sourceTag.line + 3));
    const deterministicLine = windowLines.find((line) =>
      deterministicDecisionPatterns.some((pattern) => pattern.test(line))
    );
    if (!deterministicLine) continue;

    const section = headingByLine[sourceTag.line] || 'Document Root';
    violations.push({
      severity: 'CRITICAL',
      rule: 'RETRIEVAL_POLICY_VIOLATION',
      description:
        `Deterministic gate or policy decision content is linked to ${classification} retrieval context in section "${section}" at line ${sourceTag.line}. ` +
        `Offending evidence: "${deterministicLine.trim()}"`,
      line: sourceTag.line,
      section,
      sourceClassification: classification,
    });
  }

  // Explicit GUARDRAIL_VIOLATION tags in the deliverable are findings
  for (const gv of tags['GUARDRAIL_VIOLATION:'] || []) {
    violations.push({
      severity: 'MAJOR',
      rule: 'GUARDRAIL_VIOLATION',
      description: `Guardrail violation documented: ${gv.text}`,
      line: gv.line,
    });
  }

  // AC-5: Parse and verify handoff checklist
  const handoff = parseHandoffChecklist(content);
  if (!handoff.found) {
    violations.push({
      severity: 'CRITICAL',
      rule: 'MISSING_HANDOFF_CHECKLIST',
      description: 'Handoff checklist section not found (G-GLOB-20)',
    });
  } else {
    if (handoff.unchecked > 0) {
      violations.push({
        severity: 'CRITICAL',
        rule: 'INCOMPLETE_HANDOFF',
        description: `Handoff checklist has ${handoff.unchecked} unchecked item(s) out of ${handoff.total} (G-GLOB-21)`,
      });
    }
    if (handoff.total < HANDOFF_CHECKLIST_COUNT) {
      violations.push({
        severity: 'MAJOR',
        rule: 'INSUFFICIENT_HANDOFF_ITEMS',
        description: `Handoff checklist has ${handoff.total} items, expected at least ${HANDOFF_CHECKLIST_COUNT} (G-GLOB-20)`,
      });
    }
  }

  return { violations, tags, handoff };
}

/**
 * Evaluate machine-checkable phase exit criteria for critic gates.
 * Returns unmet criteria with actionable evidence for diagnostics/UI.
 */
function evaluatePhaseExitCriteria(
  allViolations: Array<Record<string, unknown>>,
  perDeliverable: Array<Record<string, unknown>>
) {
  const unmet: Array<Record<string, unknown>> = [];
  const criticalCount = allViolations.filter((v) => v.severity === 'CRITICAL').length;
  const majorCount = allViolations.filter((v) => v.severity === 'MAJOR').length;

  if (criticalCount > 0) {
    unmet.push({
      ...PHASE_EXIT_CRITERIA[0],
      actual: criticalCount,
      expected: 0,
      evidence: allViolations
        .filter((v) => v.severity === 'CRITICAL')
        .slice(0, 10)
        .map((v) => ({
          deliverable: v.deliverable,
          rule: v.rule,
          description: v.description,
        })),
    });
  }

  if (majorCount > 0) {
    unmet.push({
      ...PHASE_EXIT_CRITERIA[1],
      actual: majorCount,
      expected: 0,
      evidence: allViolations
        .filter((v) => v.severity === 'MAJOR')
        .slice(0, 10)
        .map((v) => ({
          deliverable: v.deliverable,
          rule: v.rule,
          description: v.description,
        })),
    });
  }

  const incompleteHandoffs = perDeliverable
    .map((d) => {
      const handoff = (d.handoff || {}) as {
        found?: boolean;
        unchecked?: number;
        total?: number;
      };
      if (!handoff.found || (handoff.unchecked || 0) > 0) {
        return {
          deliverable: d.path,
          found: !!handoff.found,
          unchecked: handoff.unchecked || 0,
          total: handoff.total || 0,
        };
      }
      return null;
    })
    .filter(Boolean);

  if (incompleteHandoffs.length > 0) {
    unmet.push({
      ...PHASE_EXIT_CRITERIA[2],
      actual: incompleteHandoffs.length,
      expected: 0,
      evidence: incompleteHandoffs,
    });
  }

  return {
    criteria: PHASE_EXIT_CRITERIA,
    unmet,
    allSatisfied: unmet.length === 0,
    blockingUnmet: unmet.filter((criterion) => criterion.blocking),
  };
}

// ─── Gate Runner ─────────────────────────────────────────────

/**
 * Run the full gate validation for a critic state.
 *
 * AC-1: Reads contract definitions from contracts directory
 * AC-2: Validates required sections present (not empty, not placeholder)
 * AC-3: Checks UNCERTAIN: and INSUFFICIENT_DATA: items
 * AC-4: Validates guardrail compliance
 * AC-5: Runs Handoff Checklist verification
 * AC-6: Returns APPROVED / FAILED + list of violations
 * AC-8: Extracts QUESTIONNAIRE_REQUEST items
 *
 * @param {object} store - File store
 * @param {object} options
 * @param {string} options.criticState - e.g. 'CRITIC_1'
 * @param {string[]} options.deliverables - Paths to deliverable files
 * @param {string} [options.contractsDir] - Override contracts directory
 * @param {string} [options.guardrailsDir] - Override guardrails directory
 * @param {GovernancePoliciesConfig} [options.governanceConfig] - Governance configuration (M4)
 * @param {ResolvedIdentity} [options.identity] - Resolved user identity (M4)
 * @returns {{verdict: string, violations: Array, questionnaireRequests: Array, summary: object, governance_report?: object}}
 */
function runGate(store: GateStore, options: Record<string, unknown>) {
  const {
    criticState,
    deliverables = [],
    contractsDir = CONTRACTS_DIR,
    guardrailsDir = GUARDRAILS_DIR,
    criticToPhase: ctpOverride,
    phaseContracts: pcOverride,
    phaseGuardrails: pgOverride,
    governanceConfig,
    identity,
  } = options as {
    criticState: string;
    deliverables?: string[];
    contractsDir?: string;
    guardrailsDir?: string;
    criticToPhase?: Record<string, string>;
    phaseContracts?: Record<string, string[]>;
    phaseGuardrails?: Record<string, string[]>;
    governanceConfig?: GovernancePoliciesConfig;
    identity?: ResolvedIdentity;
  };

  const ctp: Record<string, string> = ctpOverride || CRITIC_TO_PHASE;
  const pc: Record<string, string[]> = pcOverride || PHASE_CONTRACTS;
  const pg: Record<string, string[]> = pgOverride || PHASE_GUARDRAILS;

  const phase = ctp[criticState];
  if (!phase) {
    return {
      verdict: 'FAILED',
      violations: [
        {
          severity: 'CRITICAL',
          rule: 'INVALID_CRITIC_STATE',
          description: `Unknown critic state: ${criticState}`,
        },
      ],
      questionnaireRequests: [],
      summary: {
        phase: null,
        deliverableCount: 0,
        totalViolations: 1,
        criticState,
        bySeverity: { CRITICAL: 1, MAJOR: 0, MINOR: 0, INFO: 0 },
        guardrailRulesLoaded: 0,
        contractSectionsLoaded: 0,
        questionnaireRequestCount: 0,
        perDeliverable: [],
        timestamp: new Date().toISOString(),
      },
    };
  }

  // AC-1: Load contract required sections
  const contractFiles = (pc[phase] || []).map((c) => path.join(contractsDir, c));
  const allRequiredSections: string[] = [];
  for (const cp of contractFiles) {
    allRequiredSections.push(...loadContractSections(store, cp));
  }

  // AC-4: Load guardrail rules
  const guardrailFiles = (pg[phase] || []).map((g) => path.join(guardrailsDir, g));
  const allRules: string[] = [];
  for (const gp of guardrailFiles) {
    allRules.push(...loadGuardrailRules(store, gp));
  }

  // Validate each deliverable
  const allViolations: Array<Record<string, unknown>> = [];
  const allQuestionnaireRequests: Array<Record<string, unknown>> = [];
  const perDeliverable: Array<Record<string, unknown>> = [];

  if (deliverables.length === 0) {
    allViolations.push({
      severity: 'CRITICAL',
      rule: 'NO_DELIVERABLES',
      description: 'No deliverables provided for gate validation',
    });
  }

  for (const dp of deliverables) {
    if (!store.exists(dp)) {
      const violation = {
        severity: 'CRITICAL',
        rule: 'MISSING_DELIVERABLE',
        description: `Deliverable file not found: ${dp}`,
        deliverable: dp,
      };
      allViolations.push(violation);
      perDeliverable.push({ path: dp, verdict: 'FAILED', violations: [violation] });
      continue;
    }

    const content = store.readFile(dp);
    const result = validateDocument(content, { requiredSections: allRequiredSections });

    // Tag violations with their source deliverable
    const tagged = result.violations.map((v) => ({ ...v, deliverable: dp }));
    allViolations.push(...tagged);

    // AC-8: Collect QUESTIONNAIRE_REQUEST items
    const qr = (result.tags['QUESTIONNAIRE_REQUEST'] || []).map((item) => ({
      ...item,
      deliverable: dp,
    }));
    allQuestionnaireRequests.push(...qr);

    // Also collect INSUFFICIENT_DATA items as questionnaire candidates
    const id = (result.tags['INSUFFICIENT_DATA:'] || []).map((item) => ({
      ...item,
      deliverable: dp,
    }));
    allQuestionnaireRequests.push(...id);

    const hasBlockingViolation = result.violations.some((v) => v.severity === 'CRITICAL');
    const delVerdict = hasBlockingViolation ? 'FAILED' : 'APPROVED';
    perDeliverable.push({
      path: dp,
      verdict: delVerdict,
      violations: result.violations,
      handoff: result.handoff,
    });
  }

  const exitCriteria = evaluatePhaseExitCriteria(allViolations, perDeliverable);

  // AC-6: Determine overall verdict from executable exit criteria
  const verdict = exitCriteria.blockingUnmet.length === 0 ? 'APPROVED' : 'FAILED';

  const summary = {
    phase,
    criticState,
    deliverableCount: deliverables.length,
    totalViolations: allViolations.length,
    bySeverity: {
      CRITICAL: allViolations.filter((v) => v.severity === 'CRITICAL').length,
      MAJOR: allViolations.filter((v) => v.severity === 'MAJOR').length,
      MINOR: allViolations.filter((v) => v.severity === 'MINOR').length,
      INFO: allViolations.filter((v) => v.severity === 'INFO').length,
    },
    guardrailRulesLoaded: allRules.length,
    contractSectionsLoaded: allRequiredSections.length,
    questionnaireRequestCount: allQuestionnaireRequests.length,
    exitCriteria: {
      total: exitCriteria.criteria.length,
      unmet: exitCriteria.unmet,
      blockingUnmet: exitCriteria.blockingUnmet,
      allSatisfied: exitCriteria.allSatisfied,
    },
    perDeliverable,
    timestamp: new Date().toISOString(),
  };

  // M4: Generate governance report when mode is not 'off'
  const govMode = governanceConfig?.governance_mode || 'off';
  let governance_report:
    | {
        mode: string;
        identity: ResolvedIdentity | null;
        policies_evaluated: number;
        advisories: Array<Record<string, unknown>>;
        unsatisfied_count: number;
        timestamp: string;
      }
    | undefined;

  if (govMode !== 'off' && governanceConfig) {
    const matchedPolicies = matchPolicies(governanceConfig.policies, criticState);

    // M6: Check existing approvals when provided
    const existingApprovals =
      (
        options as {
          approvals?: Array<{
            policy_id: string;
            status: string;
            decided_by?: string;
            role?: string;
          }>;
        }
      ).approvals || [];

    const advisories = matchedPolicies.map((p) => {
      // Count approvals that match this policy
      const policyApprovals = existingApprovals.filter(
        (a) => a.policy_id === p.id && a.status === 'APPROVED'
      );
      const satisfied =
        p.auto_approve || p.min_approvals === 0 || policyApprovals.length >= p.min_approvals;

      return {
        policy_id: p.id,
        gate_pattern: p.gate_pattern,
        description: p.description,
        required_roles: p.required_roles,
        min_approvals: p.min_approvals,
        auto_approve: p.auto_approve,
        advisory_message: p.advisory_message,
        satisfied,
        approval_count: policyApprovals.length,
      };
    });

    const unsatisfiedCount = advisories.filter((a) => !a.satisfied).length;

    governance_report = {
      mode: govMode,
      identity: identity || null,
      policies_evaluated: matchedPolicies.length,
      advisories,
      unsatisfied_count: unsatisfiedCount,
      timestamp: new Date().toISOString(),
    };

    // M6: Enforcing mode — block transition when policies are unsatisfied
    if (govMode === 'enforcing' && unsatisfiedCount > 0) {
      const timeoutHours =
        (options as { approval_timeout_hours?: number }).approval_timeout_hours ?? 48;

      return {
        verdict: 'PENDING_APPROVAL',
        violations: allViolations,
        questionnaireRequests: allQuestionnaireRequests,
        summary: {
          ...summary,
          blocked_by_governance: true,
          unsatisfied_policies: advisories.filter((a) => !a.satisfied).map((a) => a.policy_id),
          approval_timeout_hours: timeoutHours,
        },
        governance_report,
      };
    }
  }

  return {
    verdict,
    violations: allViolations,
    questionnaireRequests: allQuestionnaireRequests,
    summary,
    governance_report,
  };
}

// ─── Class Wrappers ──────────────────────────────────────────

/**
 * CriticValidator — validates deliverables against contracts & handoff checklist.
 * Wraps runGate with critic-specific defaults.
 */
class CriticValidator {
  _store: GateStore;
  _contractsDir: string;
  _guardrailsDir: string;
  _criticToPhase: Record<string, string>;
  _phaseContracts: Record<string, string[]>;
  _phaseGuardrails: Record<string, string[]>;

  /**
   * @param {object} store - File store
   * @param {object} [options] - { contractsDir, guardrailsDir }
   */
  constructor(store: GateStore, options: Record<string, unknown> = {}) {
    if (!store) throw new Error('CriticValidator requires a store');
    this._store = store;
    this._contractsDir = (options.contractsDir as string) || CONTRACTS_DIR;
    this._guardrailsDir = (options.guardrailsDir as string) || GUARDRAILS_DIR;
    this._criticToPhase = (options.criticToPhase as Record<string, string>) || null;
    this._phaseContracts = (options.phaseContracts as Record<string, string[]>) || null;
    this._phaseGuardrails = (options.phaseGuardrails as Record<string, string[]>) || null;
  }

  /**
   * Validate deliverables for a specific critic gate.
   * @param {string} criticState - e.g. 'CRITIC_1'
   * @param {string[]} deliverables - Paths to deliverable files
   * @returns {{verdict: string, violations: Array, questionnaireRequests: Array, summary: object}}
   */
  validate(criticState: string, deliverables: string[]) {
    return runGate(this._store, {
      criticState,
      deliverables,
      contractsDir: this._contractsDir,
      guardrailsDir: this._guardrailsDir,
      criticToPhase: this._criticToPhase,
      phaseContracts: this._phaseContracts,
      phaseGuardrails: this._phaseGuardrails,
    });
  }
}

/**
 * RiskValidator — validates deliverables with focus on risk-related tags.
 * Wraps runGate and extends with risk-specific analysis.
 */
class RiskValidator {
  _store: GateStore;
  _contractsDir: string;
  _guardrailsDir: string;
  _criticToPhase: Record<string, string>;
  _phaseContracts: Record<string, string[]>;
  _phaseGuardrails: Record<string, string[]>;

  /**
   * @param {object} store - File store
   * @param {object} [options] - { contractsDir, guardrailsDir }
   */
  constructor(store: GateStore, options: Record<string, unknown> = {}) {
    if (!store) throw new Error('RiskValidator requires a store');
    this._store = store;
    this._contractsDir = (options.contractsDir as string) || CONTRACTS_DIR;
    this._guardrailsDir = (options.guardrailsDir as string) || GUARDRAILS_DIR;
    this._criticToPhase = (options.criticToPhase as Record<string, string>) || null;
    this._phaseContracts = (options.phaseContracts as Record<string, string[]>) || null;
    this._phaseGuardrails = (options.phaseGuardrails as Record<string, string[]>) || null;
  }

  /**
   * Validate deliverables for risk assessment.
   * @param {string} criticState - e.g. 'CRITIC_1'
   * @param {string[]} deliverables - Paths to deliverable files
   * @returns {{verdict: string, violations: Array, risks: Array, summary: object}}
   */
  validate(criticState: string, deliverables: string[]) {
    const result = runGate(this._store, {
      criticState,
      deliverables,
      contractsDir: this._contractsDir,
      guardrailsDir: this._guardrailsDir,
      criticToPhase: this._criticToPhase,
      phaseContracts: this._phaseContracts,
      phaseGuardrails: this._phaseGuardrails,
    });

    // Extract risk-specific items from tags
    const risks: Array<Record<string, unknown>> = [];
    for (const del of deliverables) {
      if (!this._store.exists(del)) continue;
      const content = this._store.readFile(del);
      const securityFlags = extractTaggedItems(content, 'SECURITY_FLAG:');
      const uncertainItems = extractTaggedItems(content, 'UNCERTAIN:');
      risks.push(
        ...securityFlags.map((s) => ({ ...s, deliverable: del, type: 'security' })),
        ...uncertainItems.map((u) => ({ ...u, deliverable: del, type: 'uncertainty' }))
      );
    }

    return {
      verdict: result.verdict,
      violations: result.violations,
      risks,
      summary: { ...result.summary, riskItemCount: risks.length },
    };
  }
}

export {
  CRITIC_TO_PHASE,
  PHASE_GUARDRAILS,
  PHASE_CONTRACTS,
  PLACEHOLDER_PATTERNS,
  TRACKED_TAGS,
  HANDOFF_CHECKLIST_COUNT,
  extractSections,
  findPlaceholders,
  extractTaggedItems,
  parseHandoffChecklist,
  loadContractSections,
  loadGuardrailRules,
  validateDocument,
  runGate,
  CriticValidator,
  RiskValidator,
};
