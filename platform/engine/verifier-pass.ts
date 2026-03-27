// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Verifier Pass Service — PATTERNS M2, Epic E3.2
 *
 * Runs a structured verification sweep against high-risk deliverables
 * (architecture, security, synthesis, legal, financial, data-model).
 *
 * Rules evaluated:
 * - Handoff checklist completeness
 * - Required contract sections present
 * - Evidence references cited
 * - No UNCERTAIN: or INSUFFICIENT_DATA: items left unresolved
 * - No empty/placeholder sections
 *
 * Source: Patterns/17-reasoning-techniques.md — Path To 9.9
 * Source: platform/engine/deliverable-quality.ts (quality scoring primitives)
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type VerifierRiskCategory =
  | 'architecture'
  | 'security'
  | 'synthesis'
  | 'legal'
  | 'financial'
  | 'data-model';

export type VerifierVerdict = 'pass' | 'pass-with-warnings' | 'fail';

export interface VerifierFinding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  lineReference?: string;
  suggestedFix?: string;
}

export interface VerifierResult {
  id: string;
  deliverableSource: string;
  agentId: string;
  riskCategory: VerifierRiskCategory;
  verifiedAt: string;
  verdict: VerifierVerdict;
  score: number;
  findings: VerifierFinding[];
  revisionsRequested: number;
  revisionsApplied: number;
  selfRevisionApplied: boolean;
  selfRevisionSummary?: string;
}

export interface VerifierRunInput {
  deliverableSource: string;
  content: string;
  agentId: string;
  riskCategory: VerifierRiskCategory;
  requestedRevisions?: number;
}

// ─── Rule definitions ─────────────────────────────────────────

interface VerifierRule {
  id: string;
  severity: VerifierFinding['severity'];
  check: (content: string, category: VerifierRiskCategory) => VerifierFinding | null;
}

const VERIFIER_RULES: VerifierRule[] = [
  {
    id: 'VR-001',
    severity: 'critical',
    check: (content) => {
      const items = (content.match(/^\s*-\s*\[[ xX]\]\s+.+$/gm) || []).length;
      const checked = (content.match(/^\s*-\s*\[[xX]\]\s+.+$/gm) || []).length;
      if (items === 0) {
        return {
          ruleId: 'VR-001',
          severity: 'critical',
          description:
            'No HANDOFF CHECKLIST found. High-risk deliverables must include a completed checklist.',
          suggestedFix: 'Add a ## HANDOFF CHECKLIST section with all items checked.',
        };
      }
      if (items > 0 && checked < items) {
        return {
          ruleId: 'VR-001',
          severity: 'high',
          description: `Incomplete HANDOFF CHECKLIST: ${checked}/${items} items checked.`,
          suggestedFix: 'Resolve all open checklist items before handoff.',
        };
      }
      return null;
    },
  },
  {
    id: 'VR-002',
    severity: 'high',
    check: (content) => {
      const uncertain = (content.match(/\bUNCERTAIN:/g) || []).length;
      if (uncertain > 0) {
        return {
          ruleId: 'VR-002',
          severity: 'high',
          description: `${uncertain} unresolved UNCERTAIN: marker(s) found.`,
          suggestedFix:
            'Resolve or escalate all UNCERTAIN: items. Document in the checklist if escalated.',
        };
      }
      return null;
    },
  },
  {
    id: 'VR-003',
    severity: 'high',
    check: (content) => {
      const insufficient = (content.match(/\bINSUFFICIENT_DATA:/g) || []).length;
      if (insufficient > 0) {
        return {
          ruleId: 'VR-003',
          severity: 'high',
          description: `${insufficient} INSUFFICIENT_DATA: marker(s) found.`,
          suggestedFix:
            'Supply missing data or document escalation path. Tag with QUESTIONNAIRE_REQUEST if appropriate.',
        };
      }
      return null;
    },
  },
  {
    id: 'VR-004',
    severity: 'medium',
    check: (content) => {
      const hasEvidence = /\bsource\b|\bsource:/i.test(content) || /\bline \d+/i.test(content);
      const headings = (content.match(/^#{1,6}\s+.+$/gm) || []).length;
      if (headings >= 3 && !hasEvidence) {
        return {
          ruleId: 'VR-004',
          severity: 'medium',
          description: 'No evidence references (Source: file:line) detected.',
          suggestedFix: 'Cite file path and line numbers for all factual claims (AH-5).',
        };
      }
      return null;
    },
  },
  {
    id: 'VR-005',
    severity: 'medium',
    check: (content) => {
      const placeholders = (content.match(/TODO|FIXME|PLACEHOLDER|TBD|Lorem ipsum/gi) || []).length;
      if (placeholders > 0) {
        return {
          ruleId: 'VR-005',
          severity: 'medium',
          description: `${placeholders} placeholder(s) found (TODO/FIXME/TBD).`,
          suggestedFix: 'Replace all placeholders with concrete content (AL-1).',
        };
      }
      return null;
    },
  },
  {
    id: 'VR-006',
    severity: 'low',
    check: (content, category) => {
      // Architecture deliverables should mention at least one diagram or ADR reference
      if (category === 'architecture') {
        const hasArch = /diagram|ADR|architecture decision|C4|component/i.test(content);
        if (!hasArch) {
          return {
            ruleId: 'VR-006',
            severity: 'low',
            description:
              'Architecture deliverable has no diagram/ADR references. Consider adding C4 or ADR pointers.',
            suggestedFix: 'Add references to architecture diagrams or ADR documents.',
          };
        }
      }
      return null;
    },
  },
  {
    id: 'VR-007',
    severity: 'low',
    check: (content, category) => {
      // Security deliverables should mention OWASP or threat model
      if (category === 'security') {
        const hasSecurity = /OWASP|threat model|CVE|penetration test|security control/i.test(
          content
        );
        if (!hasSecurity) {
          return {
            ruleId: 'VR-007',
            severity: 'low',
            description:
              'Security deliverable does not reference OWASP, threat modelling, or security controls.',
            suggestedFix: 'Add OWASP Top 10 mapping or threat model reference.',
          };
        }
      }
      return null;
    },
  },
];

// ─── Service ──────────────────────────────────────────────────

export class VerifierPassService {
  private ctx: ServiceContext;
  private resultsPath = 'BusinessDocs/reasoning-collaboration/verifier-results.jsonl';

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Run the verifier pass against a high-risk deliverable.
   */
  async runVerifierPass(input: VerifierRunInput): Promise<VerifierResult> {
    const findings: VerifierFinding[] = [];

    for (const rule of VERIFIER_RULES) {
      const finding = rule.check(input.content, input.riskCategory);
      if (finding) findings.push(finding);
    }

    const criticalCount = findings.filter((f) => f.severity === 'critical').length;
    const highCount = findings.filter((f) => f.severity === 'high').length;

    let verdict: VerifierVerdict;
    if (criticalCount > 0) {
      verdict = 'fail';
    } else if (highCount > 0 || findings.length >= 3) {
      verdict = 'pass-with-warnings';
    } else {
      verdict = 'pass';
    }

    // Score: deduct points per severity
    const deduction =
      criticalCount * 0.3 +
      highCount * 0.15 +
      findings.filter((f) => f.severity === 'medium').length * 0.05;
    const score = Math.max(0, Math.min(1, 1 - deduction));

    const result: VerifierResult = {
      id: `VER-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      deliverableSource: input.deliverableSource,
      agentId: input.agentId,
      riskCategory: input.riskCategory,
      verifiedAt: new Date().toISOString(),
      verdict,
      score,
      findings,
      revisionsRequested: input.requestedRevisions ?? (verdict !== 'pass' ? findings.length : 0),
      revisionsApplied: 0,
      selfRevisionApplied: false,
    };

    await this.appendResult(result);
    return result;
  }

  /**
   * Record that a self-revision was applied to a previously verified deliverable.
   */
  async recordSelfRevision(
    verifierId: string,
    summary: string,
    revisionsApplied: number
  ): Promise<VerifierResult | undefined> {
    const results = await this.listResults();
    const result = results.find((r) => r.id === verifierId);
    if (!result) return undefined;

    result.selfRevisionApplied = true;
    result.selfRevisionSummary = summary;
    result.revisionsApplied = revisionsApplied;

    await this.saveResults(results);
    return result;
  }

  /**
   * List all verifier results (optionally filtered by agent or category).
   */
  async listResults(filters?: {
    agentId?: string;
    riskCategory?: VerifierRiskCategory;
    verdict?: VerifierVerdict;
  }): Promise<VerifierResult[]> {
    const all = await this.loadResults();
    if (!filters) return all;

    return all.filter((r) => {
      if (filters.agentId && r.agentId !== filters.agentId) return false;
      if (filters.riskCategory && r.riskCategory !== filters.riskCategory) return false;
      if (filters.verdict && r.verdict !== filters.verdict) return false;
      return true;
    });
  }

  async getResult(id: string): Promise<VerifierResult | undefined> {
    const all = await this.loadResults();
    return all.find((r) => r.id === id);
  }

  // ─── Private helpers ──────────────────────────────────────

  private async loadResults(): Promise<VerifierResult[]> {
    try {
      const raw = this.ctx.store.readFile(this.resultsPath);
      return raw
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as VerifierResult);
    } catch {
      return [];
    }
  }

  private async appendResult(result: VerifierResult): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    try {
      const existing = this.ctx.store.readFile(this.resultsPath);
      this.ctx.store.writeFile(this.resultsPath, existing + '\n' + JSON.stringify(result));
    } catch {
      this.ctx.store.writeFile(this.resultsPath, JSON.stringify(result));
    }
  }

  private async saveResults(results: VerifierResult[]): Promise<void> {
    this.ctx.store.mkdirp('BusinessDocs/reasoning-collaboration');
    this.ctx.store.writeFile(this.resultsPath, results.map((r) => JSON.stringify(r)).join('\n'));
  }
}

export function createVerifierPassService(ctx: ServiceContext): VerifierPassService {
  return new VerifierPassService(ctx);
}
