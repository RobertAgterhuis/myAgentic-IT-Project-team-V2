// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import type { ServiceContext } from '../types';

export function readSprintPlan(ctx: ServiceContext, planPath?: string | null): string | null {
  if (!planPath) return null;

  const abs = path.resolve(ctx.projectRoot, planPath);
  try {
    return ctx.store.readFile(abs);
  } catch {
    return null;
  }
}

export function readSyncReports(
  ctx: ServiceContext,
  sprintStatuses: Record<string, unknown>
): Record<string, string | null> {
  const sprintsDir = path.join(ctx.businessDocs, 'sprints');
  const phase5Dir = path.join(ctx.businessDocs, 'phase-5');
  const reports: Record<string, string | null> = {};

  for (const sprintId of Object.keys(sprintStatuses)) {
    reports[sprintId] = null;

    const path1 = path.join(sprintsDir, sprintId, 'github-sync-report.md');
    if (ctx.store.exists(path1)) {
      try {
        reports[sprintId] = ctx.store.readFile(path1);
        continue;
      } catch {
        // fall through to phase-5 fallback path
      }
    }

    const path2 = path.join(phase5Dir, `sprint-${sprintId}`, 'github-sync-report.md');
    if (ctx.store.exists(path2)) {
      try {
        reports[sprintId] = ctx.store.readFile(path2);
      } catch {
        // ignore read errors; keep null for this sprint
      }
    }
  }

  return reports;
}
