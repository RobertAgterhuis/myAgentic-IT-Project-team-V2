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

/* ── Shared response schemas (M30-008, M32-007) ──────────────── */

/** Standard error body returned by errorResponse(). */
const errorBody = {
  type: 'object' as const,
  properties: {
    error: { type: 'string' as const },
    code: { type: 'string' as const },
    message: { type: 'string' as const },
    recovery: { type: 'string' as const },
  },
};

const r200Ok = {
  200: { description: 'Success' },
};
const r201 = {
  201: { description: 'Created' },
};
const r400 = {
  400: { description: 'Validation error', ...errorBody },
};
const r401 = {
  401: { description: 'Unauthorized', ...errorBody },
};
const r403 = {
  403: { description: 'Forbidden', ...errorBody },
};
const r404 = {
  404: { description: 'Not found', ...errorBody },
};
const r409 = {
  409: { description: 'Conflict', ...errorBody },
};
const r429 = {
  429: { description: 'Rate limited', ...errorBody },
};
const r500 = {
  500: { description: 'Internal server error', ...errorBody },
};
const r503 = {
  503: { description: 'Service unavailable', ...errorBody },
};

/** Common mutation responses: 200 ok + 400 + 403 + 429. */
const mutationResponses = { ...r200Ok, ...r400, ...r403, ...r429 };

/** Common read responses: 200 + 403 + 404. */
const readResponses = {
  200: { description: 'Success' },
  ...r403,
  ...r404,
};

/** Common list responses: 200 + 403. */
const listResponses = {
  200: { description: 'Success' },
  ...r403,
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
  response: mutationResponses,
};

export const commandGet = {
  tags: ['commands'],
  response: listResponses,
};

/* ── approvals ────────────────────────────────────────────────── */

export const approvalsList = {
  tags: ['approvals'],
  response: { ...listResponses, ...r500, ...r503 },
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
  response: { ...mutationResponses, ...r404, ...r409, ...r500, ...r503 },
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
  response: { ...mutationResponses, ...r404, ...r409, ...r500, ...r503 },
};

/* ── decisions ────────────────────────────────────────────────── */

export const decisionsList = {
  tags: ['decisions'],
  response: listResponses,
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
  response: { ...mutationResponses, ...r404 },
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
  response: listResponses,
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
  response: mutationResponses,
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
  response: { ...mutationResponses, ...r201, ...r409, ...r500, ...r503 },
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
  response: mutationResponses,
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
  response: { ...mutationResponses, ...r404 },
};

export const milestoneArchive = {
  tags: ['milestones'],
  params: idParam,
  response: { ...mutationResponses, ...r404 },
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
  response: mutationResponses,
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
  response: { ...mutationResponses, ...r201, ...r503 },
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
  response: { ...mutationResponses, ...r404 },
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

export const policyPacks = {
  tags: ['policies'],
  response: { ...listResponses, ...r500 },
};

export const policySignals = {
  tags: ['policies'],
  response: { ...listResponses, ...r500 },
};

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
  response: { ...mutationResponses, ...r500 },
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
  response: { ...mutationResponses, ...r201, ...r404, ...r500 },
};

export const policyUpdate = {
  tags: ['policies'],
  body: {
    type: 'object' as const,
    required: ['policy_id'],
    properties: {
      policy_id: { type: 'string' as const, minLength: 1 },
      name: { type: 'string' as const, minLength: 1 },
      description: { type: 'string' as const },
      scope: {
        type: 'string' as const,
        enum: ['global', 'org', 'team', 'repo', 'sprint'],
      },
      category: {
        type: 'string' as const,
        enum: ['security', 'quality', 'compliance', 'process', 'architecture'],
      },
      severity: {
        type: 'string' as const,
        enum: ['blocking', 'warning', 'advisory'],
      },
      condition_type: {
        type: 'string' as const,
        enum: ['gate', 'pr', 'deploy', 'artifact', 'schedule'],
      },
      condition_check: { type: 'string' as const, minLength: 1 },
      action_message: { type: 'string' as const },
    },
    additionalProperties: false,
  },
  response: { ...mutationResponses, ...r404, ...r500 },
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
  response: listResponses,
};

export const jobDetail = {
  tags: ['jobs'],
  params: idParam,
  response: readResponses,
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
  response: { ...mutationResponses, ...r404 },
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
  response: mutationResponses,
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
  response: mutationResponses,
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
  response: mutationResponses,
};

export const orchestratorPause = {
  tags: ['orchestrator'],
  body: {
    type: 'object' as const,
    required: ['rationale'],
    properties: {
      rationale: { type: 'string' as const, minLength: 1, maxLength: 2000 },
      requested_by: { type: 'string' as const, minLength: 1, maxLength: 200 },
    },
    additionalProperties: false,
  },
  response: mutationResponses,
};

export const orchestratorOverride = {
  tags: ['orchestrator'],
  body: {
    type: 'object' as const,
    required: ['rationale'],
    properties: {
      rationale: { type: 'string' as const, minLength: 1, maxLength: 2000 },
      requested_by: { type: 'string' as const, minLength: 1, maxLength: 200 },
      mode: { type: 'string' as const, minLength: 1, maxLength: 50 },
      phases: {
        type: 'array' as const,
        minItems: 1,
        items: { type: 'string' as const },
      },
    },
    additionalProperties: false,
  },
  response: mutationResponses,
};

export const orchestratorResume = {
  tags: ['orchestrator'],
  body: {
    type: 'object' as const,
    required: ['rationale'],
    properties: {
      rationale: { type: 'string' as const, minLength: 1, maxLength: 2000 },
      requested_by: { type: 'string' as const, minLength: 1, maxLength: 200 },
    },
    additionalProperties: false,
  },
  response: mutationResponses,
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
  response: mutationResponses,
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
  response: mutationResponses,
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
  response: listResponses,
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
  response: listResponses,
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
  response: readResponses,
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
  response: readResponses,
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
  response: listResponses,
};

export const artifactDetail = {
  tags: ['artifacts'],
  params: idParam,
  response: readResponses,
};

/* ── agents ───────────────────────────────────────────────────── */

export const agentDetail = {
  tags: ['agents'],
  params: idParam,
  response: readResponses,
};

export const agentExecute = {
  tags: ['agents'],
  params: idParam,
  body: {
    type: 'object' as const,
    properties: {
      context: {
        type: 'object' as const,
        properties: {
          predecessorPaths: {
            type: 'array' as const,
            items: { type: 'string' as const, minLength: 1, maxLength: 500 },
            maxItems: 50,
          },
          questionnairePath: { type: 'string' as const, minLength: 1, maxLength: 500 },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
  response: { ...mutationResponses, ...r404, ...r500 },
};

const jobIdParam = {
  type: 'object' as const,
  required: ['jobId'],
  properties: {
    jobId: { type: 'string' as const, minLength: 1 },
  },
};

export const agentJobStatus = {
  tags: ['agents'],
  params: jobIdParam,
  response: { ...readResponses, ...r500 },
};

export const agentJobResult = {
  tags: ['agents'],
  params: jobIdParam,
  response: { ...readResponses, ...r500 },
};

export const agentJobCancel = {
  tags: ['agents'],
  params: jobIdParam,
  response: { ...mutationResponses, ...r404 },
};

export const agentExecutionHistory = {
  tags: ['agents'],
  response: listResponses,
};

/* ── sessions ─────────────────────────────────────────────────── */

export const sessionDetail = {
  tags: ['sessions'],
  params: idParam,
  response: readResponses,
};

/* ── policies (list) ──────────────────────────────────────────── */

export const policiesList = {
  tags: ['policies'],
  response: { ...listResponses, ...r500 },
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
  response: { ...mutationResponses, ...r401, ...r404, ...r503 },
};

/* ── dashboard ────────────────────────────────────────────────── */

export const dashboardHealth = {
  tags: ['dashboard'],
  response: { ...r200Ok, ...r500 },
};

export const dashboardMetrics = {
  tags: ['dashboard'],
  response: { ...r200Ok, ...r500 },
};

export const dashboardActivity = {
  tags: ['dashboard'],
  response: { ...r200Ok, ...r500 },
};

export const dashboardStats = {
  tags: ['dashboard'],
  response: { ...r200Ok, ...r500 },
};
