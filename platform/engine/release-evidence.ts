// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Release Evidence Bundle — M5-E2-I2
 *
 * Requires test results, approvals, and provenance metadata before
 * a release can be promoted to the next stage. Validates bundle
 * completeness and blocks promotion when requirements are unmet.
 *
 * Issue: #1475
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type EvidenceType =
  | 'test-results'
  | 'approval'
  | 'provenance'
  | 'security-scan'
  | 'performance-report'
  | 'change-review';

export type EvidenceStatus = 'fulfilled' | 'missing' | 'expired' | 'rejected';

export interface EvidenceItem {
  type: EvidenceType;
  description: string;
  providedBy?: string;
  /** ISO timestamp when this evidence was submitted */
  submittedAt?: string;
  /** ISO timestamp after which this evidence expires */
  expiresAt?: string;
  /** Link or path to the evidence artifact */
  artifactRef?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceRequirement {
  type: EvidenceType;
  required: boolean;
  description: string;
  /** Must not be older than this many minutes */
  maxAgeMinutes?: number;
}

export interface EvidenceBundle {
  id: string;
  releaseId: string;
  workspaceId: string;
  requirements: EvidenceRequirement[];
  evidence: EvidenceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceValidationResult {
  bundleId: string;
  releaseId: string;
  promotionAllowed: boolean;
  fulfilled: EvidenceType[];
  missing: EvidenceType[];
  expired: EvidenceType[];
  rejected: EvidenceType[];
  summary: string;
  validatedAt: string;
}

export interface CreateEvidenceBundleInput {
  releaseId: string;
  workspaceId: string;
  requirements?: Partial<EvidenceRequirement>[];
}

export interface SubmitEvidenceInput {
  bundleId: string;
  evidence: Omit<EvidenceItem, 'submittedAt'>;
}

// ─── Default requirements ─────────────────────────────────────

export const DEFAULT_EVIDENCE_REQUIREMENTS: EvidenceRequirement[] = [
  {
    type: 'test-results',
    required: true,
    description: 'Automated test suite results showing passing status.',
    maxAgeMinutes: 480,
  },
  {
    type: 'approval',
    required: true,
    description: 'At least one human approval from an authorized reviewer.',
  },
  {
    type: 'provenance',
    required: true,
    description: 'Source provenance record linking artifact to commit and pipeline run.',
  },
  {
    type: 'security-scan',
    required: true,
    description: 'SAST/DAST or dependency scan with no critical findings.',
    maxAgeMinutes: 1440,
  },
];

const BUNDLES_PATH = 'BusinessDocs/deployment/evidence-bundles.json';

// ─── Service ─────────────────────────────────────────────────

export interface ReleaseEvidenceService {
  createBundle(input: CreateEvidenceBundleInput): EvidenceBundle;
  submitEvidence(input: SubmitEvidenceInput): EvidenceBundle;
  validateBundle(bundleId: string): EvidenceValidationResult;
  getBundle(bundleId: string): EvidenceBundle | undefined;
  listBundles(releaseId?: string): EvidenceBundle[];
}

export function createReleaseEvidenceService(ctx: ServiceContext): ReleaseEvidenceService {
  function loadBundles(): EvidenceBundle[] {
    if (!ctx.store.exists(BUNDLES_PATH)) return [];
    try {
      return JSON.parse(ctx.store.readFile(BUNDLES_PATH)) as EvidenceBundle[];
    } catch {
      return [];
    }
  }

  function saveBundles(bundles: EvidenceBundle[]): void {
    ctx.store.writeFile(BUNDLES_PATH, JSON.stringify(bundles, null, 2));
  }

  function createBundle(input: CreateEvidenceBundleInput): EvidenceBundle {
    const bundles = loadBundles();
    const requirements: EvidenceRequirement[] = input.requirements
      ? input.requirements.map((override, i) => ({
          ...DEFAULT_EVIDENCE_REQUIREMENTS[i % DEFAULT_EVIDENCE_REQUIREMENTS.length],
          ...override,
        }))
      : [...DEFAULT_EVIDENCE_REQUIREMENTS];

    const now = new Date().toISOString();
    const bundle: EvidenceBundle = {
      id: `EB-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      releaseId: input.releaseId,
      workspaceId: input.workspaceId,
      requirements,
      evidence: [],
      createdAt: now,
      updatedAt: now,
    };

    bundles.push(bundle);
    saveBundles(bundles);
    return bundle;
  }

  function submitEvidence(input: SubmitEvidenceInput): EvidenceBundle {
    const bundles = loadBundles();
    const bundle = bundles.find((b) => b.id === input.bundleId);
    if (!bundle) throw new Error(`Evidence bundle '${input.bundleId}' not found.`);

    const item: EvidenceItem = {
      ...input.evidence,
      submittedAt: new Date().toISOString(),
    };

    // Replace existing evidence of this type if present
    const idx = bundle.evidence.findIndex((e) => e.type === item.type);
    if (idx >= 0) {
      bundle.evidence[idx] = item;
    } else {
      bundle.evidence.push(item);
    }

    bundle.updatedAt = new Date().toISOString();
    saveBundles(bundles);
    return bundle;
  }

  function validateBundle(bundleId: string): EvidenceValidationResult {
    const bundle = loadBundles().find((b) => b.id === bundleId);
    if (!bundle) {
      return {
        bundleId,
        releaseId: '',
        promotionAllowed: false,
        fulfilled: [],
        missing: [],
        expired: [],
        rejected: [],
        summary: `Bundle '${bundleId}' not found.`,
        validatedAt: new Date().toISOString(),
      };
    }

    const nowMs = Date.now();
    const fulfilled: EvidenceType[] = [];
    const missing: EvidenceType[] = [];
    const expired: EvidenceType[] = [];
    const rejected: EvidenceType[] = [];

    for (const req of bundle.requirements) {
      if (!req.required) continue;
      const item = bundle.evidence.find((e) => e.type === req.type);
      if (!item || !item.submittedAt) {
        missing.push(req.type);
        continue;
      }
      // Expiry check from item's own expiresAt
      if (item.expiresAt && new Date(item.expiresAt).getTime() < nowMs) {
        expired.push(req.type);
        continue;
      }
      // Age check from requirement maxAgeMinutes
      if (req.maxAgeMinutes) {
        const submittedMs = new Date(item.submittedAt).getTime();
        const ageMinutes = (nowMs - submittedMs) / 60_000;
        if (ageMinutes > req.maxAgeMinutes) {
          expired.push(req.type);
          continue;
        }
      }
      fulfilled.push(req.type);
    }

    const blockers = [...missing, ...expired, ...rejected];
    const promotionAllowed = blockers.length === 0;

    const summary = promotionAllowed
      ? `All ${fulfilled.length} required evidence items fulfilled — promotion allowed.`
      : `Promotion blocked: missing [${missing.join(', ')}]` +
        (expired.length ? `, expired [${expired.join(', ')}]` : '') +
        (rejected.length ? `, rejected [${rejected.join(', ')}]` : '') +
        '.';

    return {
      bundleId,
      releaseId: bundle.releaseId,
      promotionAllowed,
      fulfilled,
      missing,
      expired,
      rejected,
      summary,
      validatedAt: new Date().toISOString(),
    };
  }

  function getBundle(bundleId: string): EvidenceBundle | undefined {
    return loadBundles().find((b) => b.id === bundleId);
  }

  function listBundles(releaseId?: string): EvidenceBundle[] {
    const bundles = loadBundles();
    return releaseId ? bundles.filter((b) => b.releaseId === releaseId) : bundles;
  }

  return { createBundle, submitEvidence, validateBundle, getBundle, listBundles };
}
