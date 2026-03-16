// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const createApprovalRoutes = require('../../src/webapp/routes/approvals');

/* ── Mock helpers ─────────────────────────────────────────────── */

function createReq(url, method = 'GET', body = null) {
  const chunks = body ? [Buffer.from(JSON.stringify(body))] : [];
  return {
    url,
    method,
    headers: {
      host: 'localhost:3001',
      'content-type': 'application/json',
    },
    on(event, cb) {
      if (event === 'data') chunks.forEach((c) => cb(c));
      if (event === 'end') cb();
      return this;
    },
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, val) {
      res.headers[key] = val;
    },
    writeHead(code, hdrs) {
      res.statusCode = code;
      if (hdrs) Object.assign(res.headers, hdrs);
    },
    end(data) {
      res.body = data || '';
    },
  };
  return res;
}

function parsed(res) {
  return JSON.parse(res.body);
}

/* ── Shared fixtures ──────────────────────────────────────────── */

const MOCK_APPROVAL = {
  id: 'APR-001',
  entity_id: 'SP-1',
  gate_id: 'GATE-REVIEW',
  stage: 'review',
  requested_by: 'dev-user',
  requested_at: '2026-03-01T10:00:00Z',
  required_role: 'architect',
  status: 'PENDING',
};

function createMockGovernance(overrides = {}) {
  return {
    getPendingApprovals: overrides.getPendingApprovals || (() => [MOCK_APPROVAL]),
    decide:
      overrides.decide ||
      ((id, user, approved, reason) => ({
        id,
        status: approved ? 'APPROVED' : 'REJECTED',
        decided_by: user,
        decided_at: '2026-03-01T12:00:00Z',
        reason,
      })),
  };
}

function createCtx(governance = null) {
  const notified = [];
  return {
    _getEngine: governance ? () => ({ getGovernance: () => governance }) : () => null,
    sseNotify: (evt) => notified.push(evt),
    _notified: notified,
  };
}

/* ── listApprovals ────────────────────────────────────────────── */

describe('listApprovals', () => {
  it('returns 503 when governance is not available', async () => {
    const routes = createApprovalRoutes(createCtx(null));
    const handler = routes['GET /api/v1/approvals'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals'), res);
    expect(res.statusCode).toBe(503);
    expect(parsed(res).error).toContain('not available');
  });

  it('returns pending approvals list', async () => {
    const routes = createApprovalRoutes(createCtx(createMockGovernance()));
    const handler = routes['GET /api/v1/approvals'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals'), res);
    expect(res.statusCode).toBe(200);
    const data = parsed(res);
    expect(data.count).toBe(1);
    expect(data.approvals[0].id).toBe('APR-001');
    expect(data.approvals[0].gate_id).toBe('GATE-REVIEW');
  });

  it('returns empty list when no pending approvals', async () => {
    const gov = createMockGovernance({ getPendingApprovals: () => [] });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['GET /api/v1/approvals'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals'), res);
    expect(res.statusCode).toBe(200);
    expect(parsed(res).count).toBe(0);
  });

  it('returns 500 on unexpected error', async () => {
    const gov = createMockGovernance({
      getPendingApprovals: () => {
        throw new Error('db connection failed');
      },
    });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['GET /api/v1/approvals'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals'), res);
    expect(res.statusCode).toBe(500);
    expect(parsed(res).error).toBeDefined();
  });
});

/* ── approveRequest ───────────────────────────────────────────── */

describe('approveRequest', () => {
  it('returns 503 when governance is not available', async () => {
    const routes = createApprovalRoutes(createCtx(null));
    const handler = routes['POST /api/v1/approvals/:id/approve'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/approve', 'POST', { reason: 'LGTM' }), res);
    expect(res.statusCode).toBe(503);
  });

  it('returns 400 when approval ID is missing', async () => {
    const routes = createApprovalRoutes(createCtx(createMockGovernance()));
    const handler = routes['POST /api/v1/approvals/:id/approve'];
    const res = createRes();
    // URL with no ID segment: /api/v1/approvals//approve → segments[3] is empty
    await handler(createReq('/api/v1/approvals', 'POST', { reason: 'LGTM' }), res);
    // segments: ['api','v1','approvals'] — segments[3] is undefined
    expect(res.statusCode).toBe(400);
    expect(parsed(res).error).toContain('Approval ID');
  });

  it('approves a request successfully', async () => {
    const ctx = createCtx(createMockGovernance());
    const routes = createApprovalRoutes(ctx);
    const handler = routes['POST /api/v1/approvals/:id/approve'];
    const res = createRes();
    await handler(
      createReq('/api/v1/approvals/APR-001/approve', 'POST', {
        reason: 'Looks good',
        user: 'reviewer',
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    const data = parsed(res);
    expect(data.ok).toBe(true);
    expect(data.approval.status).toBe('APPROVED');
    expect(data.approval.decided_by).toBe('reviewer');
    expect(ctx._notified).toHaveLength(1);
    expect(ctx._notified[0].action).toBe('approved');
  });

  it('uses default reason and user when not provided', async () => {
    const routes = createApprovalRoutes(createCtx(createMockGovernance()));
    const handler = routes['POST /api/v1/approvals/:id/approve'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/approve', 'POST', {}), res);
    expect(res.statusCode).toBe(200);
    const data = parsed(res);
    expect(data.approval.decided_by).toBe('api-user');
    expect(data.approval.reason).toBe('Approved via API');
  });

  it('returns 404 when approval not found', async () => {
    const gov = createMockGovernance({
      decide: () => {
        throw new Error('Approval not found');
      },
    });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['POST /api/v1/approvals/:id/approve'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-999/approve', 'POST', { reason: 'ok' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when already decided', async () => {
    const gov = createMockGovernance({
      decide: () => {
        throw new Error('Request already decided');
      },
    });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['POST /api/v1/approvals/:id/approve'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/approve', 'POST', { reason: 'ok' }), res);
    expect(res.statusCode).toBe(409);
  });

  it('returns 500 on generic error', async () => {
    const gov = createMockGovernance({
      decide: () => {
        throw new Error('unexpected crash');
      },
    });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['POST /api/v1/approvals/:id/approve'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/approve', 'POST', { reason: 'ok' }), res);
    expect(res.statusCode).toBe(500);
  });
});

/* ── rejectRequest ────────────────────────────────────────────── */

describe('rejectRequest', () => {
  it('returns 503 when governance is not available', async () => {
    const routes = createApprovalRoutes(createCtx(null));
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/reject', 'POST', { reason: 'No' }), res);
    expect(res.statusCode).toBe(503);
  });

  it('returns 400 when approval ID is missing', async () => {
    const routes = createApprovalRoutes(createCtx(createMockGovernance()));
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals', 'POST', { reason: 'No' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when reason is missing', async () => {
    const routes = createApprovalRoutes(createCtx(createMockGovernance()));
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/reject', 'POST', { user: 'reviewer' }), res);
    expect(res.statusCode).toBe(400);
    expect(parsed(res).error).toContain('Reason is required');
  });

  it('returns 400 when reason is empty string', async () => {
    const routes = createApprovalRoutes(createCtx(createMockGovernance()));
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/reject', 'POST', { reason: '   ' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a request successfully', async () => {
    const ctx = createCtx(createMockGovernance());
    const routes = createApprovalRoutes(ctx);
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(
      createReq('/api/v1/approvals/APR-001/reject', 'POST', {
        reason: 'Design not approved',
        user: 'architect',
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    const data = parsed(res);
    expect(data.ok).toBe(true);
    expect(data.approval.status).toBe('REJECTED');
    expect(data.approval.decided_by).toBe('architect');
    expect(ctx._notified).toHaveLength(1);
    expect(ctx._notified[0].action).toBe('rejected');
  });

  it('returns 404 when approval not found', async () => {
    const gov = createMockGovernance({
      decide: () => {
        throw new Error('Approval not found');
      },
    });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/reject', 'POST', { reason: 'Bad' }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 409 when already decided', async () => {
    const gov = createMockGovernance({
      decide: () => {
        throw new Error('Request already decided');
      },
    });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/reject', 'POST', { reason: 'No' }), res);
    expect(res.statusCode).toBe(409);
  });

  it('returns 500 on generic error', async () => {
    const gov = createMockGovernance({
      decide: () => {
        throw new Error('kaboom');
      },
    });
    const routes = createApprovalRoutes(createCtx(gov));
    const handler = routes['POST /api/v1/approvals/:id/reject'];
    const res = createRes();
    await handler(createReq('/api/v1/approvals/APR-001/reject', 'POST', { reason: 'No' }), res);
    expect(res.statusCode).toBe(500);
  });
});

/* ── Route map structure ──────────────────────────────────────── */

describe('createApprovalRoutes', () => {
  it('returns all expected route keys', () => {
    const routes = createApprovalRoutes(createCtx(null));
    expect(routes).toHaveProperty('GET /api/v1/approvals');
    expect(routes).toHaveProperty('POST /api/v1/approvals/:id/approve');
    expect(routes).toHaveProperty('POST /api/v1/approvals/:id/reject');
    expect(Object.keys(routes)).toHaveLength(3);
  });
});
