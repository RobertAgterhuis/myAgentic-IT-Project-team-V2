import type { ApprovalEntry, PolicyEntry, Session } from '@/lib/api-types';

export interface ApprovalSummary {
  id: string;
  status: string;
  gateId: string;
  stage: string;
  requestedBy: string;
  requestedAt: string;
  requiredRole: string;
}

export interface PolicySummary {
  id: string;
  name: string;
  scope: string;
  severity: string;
  category: string;
  exceptionCount: number;
}

export interface SessionSummary {
  id: string;
  project: string;
  phase: string;
  status: Session['status'];
  progress: number;
  currentAgent: string | null;
  startedAt: string;
  completedAt: string | null;
}

export function adaptApproval(entry: ApprovalEntry): ApprovalSummary {
  return {
    id: entry.id,
    status: entry.status,
    gateId: entry.gate_id,
    stage: entry.stage,
    requestedBy: entry.requested_by,
    requestedAt: entry.requested_at,
    requiredRole: entry.required_role,
  };
}

export function adaptPolicy(entry: PolicyEntry): PolicySummary {
  return {
    id: entry.id,
    name: entry.name,
    scope: entry.scope,
    severity: entry.severity,
    category: entry.category,
    exceptionCount: entry.exception_count,
  };
}

export function adaptSession(entry: Session): SessionSummary {
  return {
    id: entry.id,
    project: entry.project,
    phase: entry.phase,
    status: entry.status,
    progress: entry.progress,
    currentAgent: entry.current_agent,
    startedAt: entry.started_at,
    completedAt: entry.completed_at,
  };
}
