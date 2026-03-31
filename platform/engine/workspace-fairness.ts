// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Workspace Fairness Controls — M5-E1-I3
 *
 * Prevents starvation and noisy-neighbor effects in shared queue environments.
 * Tracks per-workspace queue depth and throughput, enforces caps, and detects
 * workspaces that have been waiting too long without service.
 *
 * Issue: #1471
 */

import type { ServiceContext } from '../../src/webapp/services/types';

// ─── Types ────────────────────────────────────────────────────

export type FairnessStatus = 'allowed' | 'throttled' | 'starved';

export interface FairnessPolicy {
  /** Maximum concurrent in-flight items per workspace */
  maxConcurrentPerWorkspace: number;
  /** Maximum queue depth per workspace before new items are throttled */
  maxQueueDepthPerWorkspace: number;
  /** Number of scheduling cycles a workspace can be skipped before starved flag */
  starvationThresholdCycles: number;
  /** Global max concurrent across all workspaces */
  globalMaxConcurrent: number;
}

export interface WorkspaceSlot {
  workspaceId: string;
  /** Current in-flight item count */
  inFlight: number;
  /** Current queue depth (pending items) */
  queueDepth: number;
  /** Number of consecutive cycles this workspace was skipped */
  skippedCycles: number;
  /** ISO timestamp of last service */
  lastServicedAt?: string;
}

export interface FairnessCheckInput {
  workspaceId: string;
  currentSlots: WorkspaceSlot[];
  globalInFlight: number;
  policy?: Partial<FairnessPolicy>;
}

export interface FairnessCheckResult {
  status: FairnessStatus;
  workspaceId: string;
  rationale: string;
  slot: WorkspaceSlot;
  policyApplied: FairnessPolicy;
}

export interface FairnessSnapshotResult {
  policy: FairnessPolicy;
  slots: Array<WorkspaceSlot & { status: FairnessStatus }>;
  starvedWorkspaces: string[];
  throttledWorkspaces: string[];
  globalInFlight: number;
  computedAt: string;
}

// ─── Default policy ──────────────────────────────────────────

export const DEFAULT_FAIRNESS_POLICY: FairnessPolicy = {
  maxConcurrentPerWorkspace: 5,
  maxQueueDepthPerWorkspace: 20,
  starvationThresholdCycles: 3,
  globalMaxConcurrent: 50,
};

// ─── Service ─────────────────────────────────────────────────

export interface WorkspaceFairnessService {
  checkWorkspace(input: FairnessCheckInput): FairnessCheckResult;
  computeSnapshot(
    slots: WorkspaceSlot[],
    globalInFlight: number,
    policy?: Partial<FairnessPolicy>
  ): FairnessSnapshotResult;
  getDefaultPolicy(): FairnessPolicy;
}

export function createWorkspaceFairnessService(_ctx: ServiceContext): WorkspaceFairnessService {
  function getDefaultPolicy(): FairnessPolicy {
    return { ...DEFAULT_FAIRNESS_POLICY };
  }

  function resolvePolicy(override?: Partial<FairnessPolicy>): FairnessPolicy {
    return { ...DEFAULT_FAIRNESS_POLICY, ...override };
  }

  function computeStatus(
    slot: WorkspaceSlot,
    globalInFlight: number,
    policy: FairnessPolicy
  ): { status: FairnessStatus; rationale: string } {
    // Starvation takes precedence: workspace has been waiting too long
    if (slot.skippedCycles >= policy.starvationThresholdCycles) {
      return {
        status: 'starved',
        rationale:
          `Workspace '${slot.workspaceId}' skipped ${slot.skippedCycles} consecutive cycles ` +
          `(threshold: ${policy.starvationThresholdCycles}) — starvation detected.`,
      };
    }

    // Throttle if any cap is exceeded
    if (slot.inFlight >= policy.maxConcurrentPerWorkspace) {
      return {
        status: 'throttled',
        rationale:
          `Workspace '${slot.workspaceId}' has ${slot.inFlight} in-flight items ` +
          `(max: ${policy.maxConcurrentPerWorkspace}).`,
      };
    }

    if (slot.queueDepth >= policy.maxQueueDepthPerWorkspace) {
      return {
        status: 'throttled',
        rationale:
          `Workspace '${slot.workspaceId}' queue depth ${slot.queueDepth} ` +
          `exceeds limit ${policy.maxQueueDepthPerWorkspace}.`,
      };
    }

    if (globalInFlight >= policy.globalMaxConcurrent) {
      return {
        status: 'throttled',
        rationale:
          `Global in-flight count ${globalInFlight} reaches maximum ` +
          `${policy.globalMaxConcurrent}.`,
      };
    }

    return {
      status: 'allowed',
      rationale: `Workspace '${slot.workspaceId}' is within fairness limits.`,
    };
  }

  function checkWorkspace(input: FairnessCheckInput): FairnessCheckResult {
    const policy = resolvePolicy(input.policy);
    const slot: WorkspaceSlot = input.currentSlots.find(
      (s) => s.workspaceId === input.workspaceId
    ) ?? {
      workspaceId: input.workspaceId,
      inFlight: 0,
      queueDepth: 0,
      skippedCycles: 0,
    };

    const { status, rationale } = computeStatus(slot, input.globalInFlight, policy);
    return { status, workspaceId: input.workspaceId, rationale, slot, policyApplied: policy };
  }

  function computeSnapshot(
    slots: WorkspaceSlot[],
    globalInFlight: number,
    policy?: Partial<FairnessPolicy>
  ): FairnessSnapshotResult {
    const resolved = resolvePolicy(policy);
    const evaluated = slots.map((slot) => {
      const { status } = computeStatus(slot, globalInFlight, resolved);
      return { ...slot, status };
    });

    return {
      policy: resolved,
      slots: evaluated,
      starvedWorkspaces: evaluated.filter((s) => s.status === 'starved').map((s) => s.workspaceId),
      throttledWorkspaces: evaluated
        .filter((s) => s.status === 'throttled')
        .map((s) => s.workspaceId),
      globalInFlight,
      computedAt: new Date().toISOString(),
    };
  }

  return { checkWorkspace, computeSnapshot, getDefaultPolicy };
}
