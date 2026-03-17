// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Fastify-native JSON Schema definitions for request validation (M30-006).
 *
 * Each export is a Fastify route-level `schema` object containing
 * `body`, `querystring`, and/or `params` schemas.  Fastify compiles
 * these via Ajv at startup and validates every incoming request
 * *before* the handler runs — removing the need for manual
 * structural checks inside handlers.
 *
 * Domain-level business validation (secret detection, path traversal,
 * cross-field rules) remains in the handlers.
 *
 * @module route-schemas
 */

/* ── Shared fragments ─────────────────────────────────────────── */

const idParam = {
  type: 'object' as const,
  required: ['id'],
  properties: {
    id: { type: 'string' as const, minLength: 1 },
  },
};

/* ── commands ─────────────────────────────────────────────────── */

export const commandCreate = {
  tags: ['commands'],
  body: {
    type: 'object' as const,
    required: ['command'],
    properties: {
      command: { type: 'string' as const, minLength: 1, maxLength: 100 },
      project: { type: 'string' as const, maxLength: 200 },
      description: { type: 'string' as const, maxLength: 2000 },
      scope: { type: 'string' as const, maxLength: 200 },
      brief: { type: 'string' as const, maxLength: 200000 },
    },
    additionalProperties: false,
  },
};

export const commandGet = {
  tags: ['commands'],
};

/* ── approvals ────────────────────────────────────────────────── */

export const approvalsList = {
  tags: ['approvals'],
};

export const approvalApprove = {
  tags: ['approvals'],
  params: idParam,
  body: {
    type: 'object' as const,
    properties: {
      reason: { type: 'string' as const, maxLength: 1000 },
      user: { type: 'string' as const, maxLength: 200 },
    },
    additionalProperties: false,
  },
};

export const approvalReject = {
  tags: ['approvals'],
  params: idParam,
  body: {
    type: 'object' as const,
    required: ['reason'],
    properties: {
      reason: { type: 'string' as const, minLength: 1, maxLength: 1000 },
      user: { type: 'string' as const, maxLength: 200 },
    },
    additionalProperties: false,
  },
};

/* ── decisions ────────────────────────────────────────────────── */

export const decisionsList = {
  tags: ['decisions'],
};

export const decisionMutate = {
  tags: ['decisions'],
  body: {
    type: 'object' as const,
    required: ['action'],
    properties: {
      action: { type: 'string' as const, minLength: 1 },
      id: { type: 'string' as const },
      type: { type: 'string' as const },
      priority: { type: 'string' as const },
      scope: { type: 'string' as const, maxLength: 200 },
      text: { type: 'string' as const, maxLength: 2000 },
      notes: { type: 'string' as const, maxLength: 2000 },
      answer: { type: 'string' as const, maxLength: 2000 },
      reason: { type: 'string' as const, maxLength: 2000 },
    },
    additionalProperties: false,
  },
};

export const decisionActivateCategory = {
  tags: ['decisions'],
  body: {
    type: 'object' as const,
    required: ['file'],
    properties: {
      file: { type: 'string' as const, minLength: 1, maxLength: 100 },
    },
    additionalProperties: false,
  },
};

export const decisionPromoteLesson = {
  tags: ['decisions'],
  body: {
    type: 'object' as const,
    required: ['lessonId'],
    properties: {
      lessonId: { type: 'string' as const, minLength: 1 },
      priority: { type: 'string' as const },
      scope: { type: 'string' as const },
    },
    additionalProperties: false,
  },
};

/* ── questionnaires ───────────────────────────────────────────── */

export const questionnairesList = {
  tags: ['questionnaires'],
};

export const questionnaireSave = {
  tags: ['questionnaires'],
  body: {
    type: 'object' as const,
    required: ['file', 'updates'],
    properties: {
      file: { type: 'string' as const, minLength: 1, maxLength: 500 },
      updates: {
        type: 'array' as const,
        minItems: 1,
        maxItems: 200,
        items: {
          type: 'object' as const,
          required: ['questionId'],
          properties: {
            questionId: { type: 'string' as const, minLength: 1 },
            answer: { type: 'string' as const },
            status: {
              type: 'string' as const,
              enum: ['OPEN', 'ANSWERED', 'DEFERRED'],
            },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
};

/* ── subscribe ────────────────────────────────────────────────── */

export const subscribe = {
  tags: ['subscribe'],
  body: {
    type: 'object' as const,
    required: ['email'],
    properties: {
      email: { type: 'string' as const, format: 'email', maxLength: 320 },
      metadata: {
        type: 'object' as const,
        properties: {
          segment: {
            type: 'string' as const,
            enum: ['engineering-leaders', 'product-managers', 'developers', 'evaluators'],
          },
          source: { type: 'string' as const, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
};

/* ── milestones ───────────────────────────────────────────────── */

export const milestoneCreate = {
  tags: ['milestones'],
  body: {
    type: 'object' as const,
    required: ['name', 'status', 'progress', 'completion'],
    properties: {
      name: { type: 'string' as const, minLength: 1, maxLength: 255 },
      status: {
        type: 'string' as const,
        enum: ['not started', 'in progress', 'complete', 'blocked'],
      },
      progress: { type: 'integer' as const, minimum: 0, maximum: 100 },
      completion: { type: 'string' as const, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    },
    additionalProperties: false,
  },
};

export const milestoneUpdate = {
  tags: ['milestones'],
  params: idParam,
  body: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' as const, minLength: 1, maxLength: 255 },
      status: {
        type: 'string' as const,
        enum: ['not started', 'in progress', 'complete', 'blocked'],
      },
      progress: { type: 'integer' as const, minimum: 0, maximum: 100 },
      completion: { type: 'string' as const, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    },
    additionalProperties: false,
  },
};

export const milestoneArchive = {
  tags: ['milestones'],
  params: idParam,
};

export const milestoneTemplateCreate = {
  tags: ['milestones'],
  body: {
    type: 'object' as const,
    required: ['name', 'milestones'],
    properties: {
      name: { type: 'string' as const, minLength: 1, maxLength: 255 },
      milestones: {
        type: 'array' as const,
        minItems: 1,
        items: {
          type: 'object' as const,
          required: ['name', 'status', 'progress', 'completion'],
          properties: {
            name: { type: 'string' as const, minLength: 1, maxLength: 255 },
            status: {
              type: 'string' as const,
              enum: ['not started', 'in progress', 'complete', 'blocked'],
            },
            progress: { type: 'integer' as const, minimum: 0, maximum: 100 },
            completion: { type: 'string' as const, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
};

/* ── workspaces ───────────────────────────────────────────────── */

export const workspaceCreate = {
  tags: ['workspaces'],
  body: {
    type: 'object' as const,
    required: ['id', 'name', 'owner'],
    properties: {
      id: { type: 'string' as const, minLength: 1 },
      name: { type: 'string' as const, minLength: 1 },
      owner: { type: 'string' as const, minLength: 1 },
    },
    additionalProperties: false,
  },
};

export const workspaceUpdate = {
  tags: ['workspaces'],
  params: idParam,
  body: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' as const, minLength: 1 },
      owner: { type: 'string' as const, minLength: 1 },
    },
    additionalProperties: false,
  },
};

export const workspaceAddRepository = {
  tags: ['workspaces'],
  params: idParam,
  body: {
    type: 'object' as const,
    required: ['id', 'name', 'provider', 'url', 'defaultBranch'],
    properties: {
      id: { type: 'string' as const, minLength: 1 },
      name: { type: 'string' as const, minLength: 1 },
      provider: {
        type: 'string' as const,
        enum: ['github', 'azure-devops', 'gitlab', 'local'],
      },
      url: { type: 'string' as const, minLength: 1 },
      defaultBranch: { type: 'string' as const, minLength: 1 },
      tags: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    additionalProperties: false,
  },
};

export const workspaceCreateProject = {
  tags: ['workspaces'],
  params: idParam,
  body: {
    type: 'object' as const,
    required: ['id', 'name'],
    properties: {
      id: { type: 'string' as const, minLength: 1 },
      name: { type: 'string' as const, minLength: 1 },
      repositories: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
    },
    additionalProperties: false,
  },
};

/* ── policies ─────────────────────────────────────────────────── */

export const policyEvaluate = {
  tags: ['policies'],
  body: {
    type: 'object' as const,
    required: ['context_type', 'scope'],
    properties: {
      context_type: {
        type: 'string' as const,
        enum: ['gate', 'pr', 'deploy', 'artifact', 'schedule'],
      },
      scope: {
        type: 'string' as const,
        enum: ['global', 'org', 'team', 'repo', 'sprint'],
      },
      checks: { type: 'object' as const },
    },
    additionalProperties: false,
  },
};

export const policyCreateException = {
  tags: ['policies'],
  body: {
    type: 'object' as const,
    required: ['policy_id', 'reason', 'approved_by'],
    properties: {
      policy_id: { type: 'string' as const, minLength: 1 },
      reason: { type: 'string' as const, minLength: 1 },
      approved_by: { type: 'string' as const, minLength: 1 },
      expires: { type: 'string' as const },
      scope_override: { type: 'string' as const },
    },
    additionalProperties: false,
  },
};

/* ── jobs ─────────────────────────────────────────────────────── */

export const jobsList = {
  tags: ['jobs'],
  querystring: {
    type: 'object' as const,
    properties: {
      status: { type: 'string' as const },
      type: { type: 'string' as const },
      limit: { type: 'string' as const, pattern: '^\\d+$' },
    },
    additionalProperties: false,
  },
};

export const jobDetail = {
  tags: ['jobs'],
  params: idParam,
};

export const jobCancel = {
  tags: ['jobs'],
  body: {
    type: 'object' as const,
    required: ['job_id'],
    properties: {
      job_id: { type: 'string' as const, minLength: 1, maxLength: 100 },
    },
    additionalProperties: false,
  },
};

/* ── orchestrator ─────────────────────────────────────────────── */

export const orchestratorAdvance = {
  tags: ['orchestrator'],
  body: {
    type: 'object' as const,
    properties: {
      gateResult: {},
    },
    additionalProperties: false,
  },
};

export const orchestratorError = {
  tags: ['orchestrator'],
  body: {
    type: 'object' as const,
    required: ['reason'],
    properties: {
      reason: { type: 'string' as const, minLength: 1, maxLength: 2000 },
    },
    additionalProperties: false,
  },
};

export const orchestratorReset = {
  tags: ['orchestrator'],
  body: {
    type: 'object' as const,
    required: ['mode'],
    properties: {
      mode: { type: 'string' as const, minLength: 1, maxLength: 50 },
      phases: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      template: { type: 'string' as const, maxLength: 100 },
    },
    additionalProperties: false,
  },
};

/* ── misc ─────────────────────────────────────────────────────── */

export const reevaluate = {
  tags: ['system'],
  body: {
    type: 'object' as const,
    properties: {
      scope: {
        type: 'string' as const,
        enum: ['ALL', 'BUSINESS', 'TECH', 'UX', 'MARKETING'],
      },
    },
    additionalProperties: false,
  },
};

export const analyticsPost = {
  tags: ['analytics'],
  body: {
    type: 'object' as const,
    required: ['events'],
    properties: {
      events: {
        type: 'array' as const,
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object' as const,
          required: ['event'],
          properties: {
            event: {
              type: 'string' as const,
              enum: [
                'page_view',
                'tab_switch',
                'command_launch',
                'questionnaire_save',
                'decision_update',
                'error_displayed',
                'feature_usage',
                'session_start',
                'session_end',
              ],
            },
            properties: { type: 'object' as const },
            timestamp: { type: 'string' as const },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
};

export const analyticsGet = {
  tags: ['analytics'],
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'string' as const, pattern: '^\\d+$' },
      offset: { type: 'string' as const, pattern: '^\\d+$' },
    },
    additionalProperties: false,
  },
};

export const auditGet = {
  tags: ['system'],
  querystring: {
    type: 'object' as const,
    properties: {
      limit: { type: 'string' as const, pattern: '^\\d+$' },
    },
    additionalProperties: false,
  },
};

export const helpGet = {
  tags: ['system'],
  querystring: {
    type: 'object' as const,
    properties: {
      topic: { type: 'string' as const, pattern: '^[a-z0-9-]+$' },
    },
    additionalProperties: false,
  },
};

/* ── analytics v1 ─────────────────────────────────────────────── */

export const analyticsV1MetricQuery = {
  tags: ['analytics'],
  params: {
    type: 'object' as const,
    required: ['name'],
    properties: {
      name: { type: 'string' as const, minLength: 1 },
    },
  },
};

/* ── artifacts ────────────────────────────────────────────────── */

export const artifactsList = {
  tags: ['artifacts'],
  querystring: {
    type: 'object' as const,
    properties: {
      stage: { type: 'string' as const },
      type: { type: 'string' as const },
      status: { type: 'string' as const },
    },
    additionalProperties: false,
  },
};

export const artifactDetail = {
  tags: ['artifacts'],
  params: idParam,
};

/* ── agents ───────────────────────────────────────────────────── */

export const agentDetail = {
  tags: ['agents'],
  params: idParam,
};

/* ── sessions ─────────────────────────────────────────────────── */

export const sessionDetail = {
  tags: ['sessions'],
  params: idParam,
};

/* ── policies (list) ──────────────────────────────────────────── */

export const policiesList = {
  tags: ['policies'],
};

/* ── auth ──────────────────────────────────────────────────────── */

export const authUpdateRole = {
  tags: ['auth'],
  params: idParam,
  body: {
    type: 'object' as const,
    required: ['role'],
    properties: {
      role: { type: 'string' as const, enum: ['admin', 'operator', 'viewer'] },
    },
    additionalProperties: false,
  },
};
