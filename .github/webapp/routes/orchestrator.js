// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Orchestrator route handlers — GET/POST /api/orchestrator/*
 * Exposes the state machine engine to the webapp UI.
 *
 * Endpoints:
 *   GET  /api/orchestrator/status   — Current engine state
 *   POST /api/orchestrator/advance  — Advance to next state
 *   POST /api/orchestrator/error    — Force ERROR state
 *   POST /api/orchestrator/recover  — Recover from ERROR
 *   POST /api/orchestrator/reset    — Reset with a new mode
 *
 * @module routes/orchestrator
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

const { getStore } = require('../store');
const { createEngine } = require('../orchestrator/engine');
const { errorResponse } = require('../utils/errors');
const { structuredLog, json, parseBody, setSecurityHeaders } = require('../middleware');

module.exports = function createOrchestratorRoutes(ctx) {
  const { sseNotify } = ctx;

  // Lazy-initialized engine (created on first request)
  let _engine = null;

  function getEngine() {
    if (!_engine) {
      _engine = createEngine({
        store: getStore(),
        sseNotify,
      });
      structuredLog('info', 'orchestrator_engine_initialized', {
        state: _engine.status().state,
        mode: _engine.status().mode,
      });
    }
    return _engine;
  }

  // ── GET /api/orchestrator/status ──────────────────────────

  function handleStatus(_req, res) {
    try {
      const engine = getEngine();
      return json(res, 200, engine.status());
    } catch (err) {
      structuredLog('error', 'orchestrator_status_error', { error: err.message });
      return json(res, 500, errorResponse('ENGINE_ERROR', err.message));
    }
  }

  // ── POST /api/orchestrator/advance ────────────────────────

  async function handleAdvance(req, res) {
    try {
      const body = await parseBody(req);
      const engine = getEngine();
      const gateResult = body && body.gateResult ? body.gateResult : undefined;
      const result = engine.advance(gateResult);
      return json(res, 200, { ok: true, transition: result, status: engine.status() });
    } catch (err) {
      structuredLog('warn', 'orchestrator_advance_failed', { error: err.message });
      return json(res, 400, errorResponse('ADVANCE_FAILED', err.message));
    }
  }

  // ── POST /api/orchestrator/error ──────────────────────────

  async function handleError(req, res) {
    try {
      const body = await parseBody(req);
      if (!body || !body.reason) {
        return json(res, 400, errorResponse('INVALID_INPUT', 'reason is required'));
      }
      const engine = getEngine();
      engine.error(String(body.reason).slice(0, 2000));
      return json(res, 200, { ok: true, status: engine.status() });
    } catch (err) {
      structuredLog('error', 'orchestrator_error_failed', { error: err.message });
      return json(res, 500, errorResponse('ENGINE_ERROR', err.message));
    }
  }

  // ── POST /api/orchestrator/recover ────────────────────────

  async function handleRecover(_req, res) {
    try {
      const engine = getEngine();
      const recoveredState = engine.recover();
      return json(res, 200, { ok: true, recoveredState, status: engine.status() });
    } catch (err) {
      structuredLog('warn', 'orchestrator_recover_failed', { error: err.message });
      return json(res, 400, errorResponse('RECOVER_FAILED', err.message));
    }
  }

  // ── POST /api/orchestrator/reset ──────────────────────────

  async function handleReset(req, res) {
    try {
      const body = await parseBody(req);
      if (!body || !body.mode) {
        return json(res, 400, errorResponse('INVALID_INPUT', 'mode is required'));
      }
      const mode = String(body.mode).slice(0, 50);
      const phases = Array.isArray(body.phases) ? body.phases.map((p) => String(p)) : undefined;

      const engine = getEngine();
      // Force re-creation of engine with new mode
      _engine = null;
      const newEngine = getEngine();
      const result = newEngine.reset(mode, phases);
      return json(res, 200, { ok: true, status: result });
    } catch (err) {
      structuredLog('error', 'orchestrator_reset_failed', { error: err.message });
      return json(res, 500, errorResponse('RESET_FAILED', err.message));
    }
  }

  // ── POST /api/orchestrator/validate-gate ──────────────────

  async function handleValidateGate(req, res) {
    try {
      const body = await parseBody(req);
      if (!body || !Array.isArray(body.deliverables) || body.deliverables.length === 0) {
        return json(
          res,
          400,
          errorResponse('INVALID_INPUT', 'deliverables array is required and must not be empty')
        );
      }
      const deliverables = body.deliverables.map((d) => String(d));
      const engine = getEngine();
      const result = engine.validateGate(deliverables);
      structuredLog(result.verdict === 'APPROVED' ? 'info' : 'warn', 'orchestrator_gate_result', {
        verdict: result.verdict,
        phase: result.summary.phase,
        violations: result.summary.totalViolations,
      });
      return json(res, 200, { ok: true, ...result });
    } catch (err) {
      structuredLog('error', 'orchestrator_validate_gate_error', { error: err.message });
      return json(res, 500, errorResponse('GATE_VALIDATION_ERROR', err.message));
    }
  }

  // ── POST /api/orchestrator/sprint-gate ────────────────────

  async function handleSprintGate(req, res) {
    try {
      const body = await parseBody(req);
      if (!body || !body.sprintId) {
        return json(res, 400, errorResponse('INVALID_INPUT', 'sprintId is required'));
      }
      const engine = getEngine();
      const result = engine.sprintGate({
        sprintId: String(body.sprintId).slice(0, 50),
        stories: Array.isArray(body.stories) ? body.stories : [],
        plannedItems: body.plannedItems != null ? Number(body.plannedItems) : undefined,
        paths: body.paths || {},
      });
      structuredLog(result.verdict === 'READY' ? 'info' : 'warn', 'orchestrator_sprint_gate', {
        verdict: result.verdict,
        sprintId: result.summary.sprintId,
        blockers: result.summary.totalBlockers,
      });
      return json(res, 200, { ok: true, ...result });
    } catch (err) {
      structuredLog('error', 'orchestrator_sprint_gate_error', { error: err.message });
      return json(res, 500, errorResponse('SPRINT_GATE_ERROR', err.message));
    }
  }

  return {
    'GET /api/orchestrator/status': handleStatus,
    'POST /api/orchestrator/advance': handleAdvance,
    'POST /api/orchestrator/error': handleError,
    'POST /api/orchestrator/recover': handleRecover,
    'POST /api/orchestrator/reset': handleReset,
    'POST /api/orchestrator/validate-gate': handleValidateGate,
    'POST /api/orchestrator/sprint-gate': handleSprintGate,
  };
};
