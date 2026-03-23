// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type {
  ChatContextSnapshot,
  ChatIntent,
  ProposedAction,
  ProposedActionType,
} from '../chat-service';

interface ActionProposerInput {
  intent: ChatIntent;
  message: string;
  contextSnapshot?: ChatContextSnapshot;
}

function makeActionId(type: ProposedActionType): string {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function toCommandPayload(message: string): Record<string, unknown> {
  const lowered = message.toLowerCase();

  if (lowered.includes('feature')) {
    return {
      command: 'FEATURE',
      description: 'Start a feature run from chat context',
      scope: 'chat-panel',
    };
  }

  if (lowered.includes('audit')) {
    return {
      command: 'AUDIT',
      description: 'Start an audit run from chat context',
      scope: 'chat-panel',
    };
  }

  return {
    command: 'CREATE',
    description: 'Start a create run from chat context',
    scope: 'chat-panel',
  };
}

function extractApprovalId(message: string): string | null {
  const match = message.toUpperCase().match(/APR-[A-Z0-9_-]+/);
  return match?.[0] ?? null;
}

export class ActionProposer {
  propose(input: ActionProposerInput): ProposedAction[] {
    const message = input.message.trim();
    const lowered = message.toLowerCase();
    const actions: ProposedAction[] = [];

    if (
      lowered.includes('start') ||
      lowered.includes('run') ||
      lowered.includes('execute') ||
      lowered.includes('feature')
    ) {
      actions.push({
        id: makeActionId('create_command'),
        label: 'Start a run',
        type: 'create_command',
        payload: toCommandPayload(message),
        requires_confirmation: true,
      });
    }

    const approvalId = extractApprovalId(message);
    if (lowered.includes('approve') && approvalId) {
      actions.push({
        id: makeActionId('approve'),
        label: `Approve ${approvalId}`,
        type: 'approve',
        payload: {
          approval_id: approvalId,
          reason: 'Approved via chat action',
          user: 'chat-user',
        },
        requires_confirmation: true,
      });
    }

    if (lowered.includes('reject') && approvalId) {
      actions.push({
        id: makeActionId('reject'),
        label: `Reject ${approvalId}`,
        type: 'reject',
        payload: {
          approval_id: approvalId,
          reason: 'Rejected via chat action',
          user: 'chat-user',
        },
        requires_confirmation: true,
      });
    }

    if (lowered.includes('pause')) {
      actions.push({
        id: makeActionId('pause'),
        label: 'Pause current run',
        type: 'pause',
        payload: {
          command: 'PAUSE',
        },
        requires_confirmation: true,
      });
    }

    if (lowered.includes('resume') || lowered.includes('continue')) {
      actions.push({
        id: makeActionId('resume'),
        label: 'Resume current run',
        type: 'resume',
        payload: {
          command: 'CONTINUE',
        },
        requires_confirmation: false,
      });
    }

    if (input.intent === 'approval_guidance') {
      actions.push({
        id: makeActionId('open_screen'),
        label: 'Open approval center',
        type: 'open_screen',
        payload: {
          target: '/approvals',
        },
        requires_confirmation: false,
      });
    } else if (input.intent === 'workspace_navigation') {
      actions.push({
        id: makeActionId('open_screen'),
        label: 'Open workspaces',
        type: 'open_screen',
        payload: {
          target: '/workspaces',
        },
        requires_confirmation: false,
      });
    } else if (input.intent === 'session_status') {
      actions.push({
        id: makeActionId('open_screen'),
        label: 'Open pipeline status',
        type: 'open_screen',
        payload: {
          target: '/pipeline',
        },
        requires_confirmation: false,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: makeActionId('open_screen'),
        label: 'Open dashboard',
        type: 'open_screen',
        payload: {
          target: '/dashboard',
        },
        requires_confirmation: false,
      });
    }

    // Keep stable order while avoiding duplicate open_screen targets.
    const seen = new Set<string>();
    return actions.filter((action) => {
      const key = `${action.type}:${JSON.stringify(action.payload ?? {})}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
