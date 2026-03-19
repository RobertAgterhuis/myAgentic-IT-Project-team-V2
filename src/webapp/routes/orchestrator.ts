// Copyright (c) 2026 Robert Agterhuis. MIT License.

// @ts-nocheck
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

import path from 'path';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { getStore } from '../store';
import { createEngine } from '../../../platform/engine/engine';
import { listTemplates, seedDecisions } from '../../../platform/engine/template-loader';
import { errorResponse } from '../utils/errors';
import { structuredLog } from '../middleware';
import { sessionTracker } from '../session-tracker';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const { sseNotify } = ctx;

  // Lazy-initialized engine (created on first request)
  let _engine = null;
  let _templateName = undefined;

  function getEngine() {
    if (!_engine) {
      _engine = createEngine({
        store: getStore(),
        sseNotify,
        templateName: _templateName,
      });
      structuredLog('info', 'orchestrator_engine_initialized', {
        state: _engine.status().state,
        mode: _engine.status().mode,
        templateName: _engine.status().templateName,
      });
    }
    return _engine;
  }

  // ── GET /api/orchestrator/templates ───────────────────────

  app.get(
    '/api/orchestrator/templates',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const templates = listTemplates();
        return reply.send({ ok: true, templates });
      } catch (err) {
        structuredLog('error', 'orchestrator_templates_error', { error: err.message });
        return reply.code(500).send(errorResponse('TEMPLATE_ERROR', err.message));
      }
    }
  );

  // ── GET /api/orchestrator/status ──────────────────────────

  app.get(
    '/api/orchestrator/status',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        return reply.send(engine.status());
      } catch (err) {
        structuredLog('error', 'orchestrator_status_error', { error: err.message });
        return reply.code(500).send(errorResponse('ENGINE_ERROR', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/advance ────────────────────────

  app.post(
    '/api/orchestrator/advance',
    { schema: RS.orchestratorAdvance },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        const engine = getEngine();
        const gateResult = body && body.gateResult ? body.gateResult : undefined;
        const prevState = engine.status().state;
        const prevPhase = engine.status().phase;
        const prevAgent = engine.status().agent;
        const result = engine.advance(gateResult);
        const newStatus = engine.status();

        // Session tracking: start session on first advance from IDLE/READY
        const activeSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (!activeSession && (prevState === 'IDLE' || prevState === 'READY')) {
          const project = newStatus.templateName || 'default';
          const flow = newStatus.mode || 'CREATE';
          sessionTracker.startSession(project, flow);
        }

        // Track phase transitions
        const currentSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (currentSession) {
          if (prevPhase !== newStatus.phase && newStatus.phase) {
            if (prevPhase) {
              sessionTracker.addTimelineEvent(currentSession.id, {
                type: 'phase_complete',
                description: `Phase completed: ${prevPhase}`,
                phase: prevPhase,
              });
              sseNotify('phase_complete', {
                type: 'phase_complete',
                session_id: currentSession.id,
                phase: prevPhase,
                timestamp: new Date().toISOString(),
              });
            }
            sessionTracker.addTimelineEvent(currentSession.id, {
              type: 'phase_start',
              description: `Phase started: ${newStatus.phase}`,
              phase: newStatus.phase,
            });
            sseNotify('phase_start', {
              type: 'phase_start',
              session_id: currentSession.id,
              phase: newStatus.phase,
              timestamp: new Date().toISOString(),
            });
            sessionTracker.updateSession(currentSession.id, { phase: newStatus.phase });
          }

          // Track agent transitions
          if (prevAgent !== newStatus.agent && newStatus.agent) {
            if (prevAgent) {
              sessionTracker.completeAgent(prevAgent);
              sessionTracker.addTimelineEvent(currentSession.id, {
                type: 'agent_complete',
                description: `Agent completed: ${prevAgent}`,
                agent: prevAgent,
                phase: newStatus.phase,
              });
              sseNotify('agent_complete', {
                type: 'agent_complete',
                session_id: currentSession.id,
                agent: prevAgent,
                timestamp: new Date().toISOString(),
              });
            }
            sessionTracker.startAgent(
              currentSession.id,
              newStatus.agent,
              newStatus.agent,
              newStatus.phase || '',
              `Processing ${newStatus.phase || 'unknown'}`
            );
            sessionTracker.addTimelineEvent(currentSession.id, {
              type: 'agent_start',
              description: `Agent started: ${newStatus.agent}`,
              agent: newStatus.agent,
              phase: newStatus.phase,
            });
            sseNotify('agent_start', {
              type: 'agent_start',
              session_id: currentSession.id,
              agent: newStatus.agent,
              timestamp: new Date().toISOString(),
            });
            sessionTracker.updateSession(currentSession.id, { current_agent: newStatus.agent });
          }

          // Session completion on DONE/COMPLETE
          if (newStatus.state === 'DONE' || newStatus.state === 'COMPLETE') {
            sessionTracker.completeSession(currentSession.id, 'completed');
            sseNotify('session_complete', {
              type: 'session_complete',
              session_id: currentSession.id,
              status: 'completed',
              timestamp: new Date().toISOString(),
            });
          }
        }

        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          transition: true,
          from: prevState,
          to: newStatus.state,
          phase: newStatus.phase,
          agent: newStatus.agent,
          timestamp: new Date().toISOString(),
        });
        return reply.send({ ok: true, transition: result, status: newStatus });
      } catch (err) {
        structuredLog('warn', 'orchestrator_advance_failed', { error: err.message });
        return reply.code(400).send(errorResponse('ADVANCE_FAILED', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/error ──────────────────────────

  app.post(
    '/api/orchestrator/error',
    { schema: RS.orchestratorError },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        const engine = getEngine();
        engine.error(String(body.reason).slice(0, 2000));
        const errorStatus = engine.status();

        // Track session error
        const activeSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (activeSession) {
          sessionTracker.addTimelineEvent(activeSession.id, {
            type: 'error',
            description: `Error: ${String(body.reason).slice(0, 200)}`,
            metadata: { reason: String(body.reason).slice(0, 200) },
          });
          sessionTracker.updateSession(activeSession.id, { status: 'failed' });
          sseNotify('session_complete', {
            type: 'session_complete',
            session_id: activeSession.id,
            status: 'failed',
            timestamp: new Date().toISOString(),
          });
        }

        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          state: 'ERROR',
          reason: String(body.reason).slice(0, 200),
          timestamp: new Date().toISOString(),
        });
        return reply.send({ ok: true, status: errorStatus });
      } catch (err) {
        structuredLog('error', 'orchestrator_error_failed', { error: err.message });
        return reply.code(500).send(errorResponse('ENGINE_ERROR', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/recover ────────────────────────

  app.post(
    '/api/orchestrator/recover',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        const recoveredState = engine.recover();
        const recoverStatus = engine.status();
        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          state: recoverStatus.state,
          recovered: true,
          timestamp: new Date().toISOString(),
        });
        return reply.send({ ok: true, recoveredState, status: recoverStatus });
      } catch (err) {
        structuredLog('warn', 'orchestrator_recover_failed', { error: err.message });
        return reply.code(400).send(errorResponse('RECOVER_FAILED', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/reset ──────────────────────────

  app.post(
    '/api/orchestrator/reset',
    { schema: RS.orchestratorReset },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        const mode = String(body.mode).slice(0, 50);
        const phases = Array.isArray(body.phases) ? body.phases.map((p) => String(p)) : undefined;
        const template = body.template ? String(body.template).slice(0, 100) : undefined;

        // Force re-creation of engine (possibly with new template)
        if (template) {
          _templateName = template;
        }
        _engine = null;
        const newEngine = getEngine();
        const result = newEngine.reset(mode, phases);
        return reply.send({ ok: true, status: result });
      } catch (err) {
        structuredLog('error', 'orchestrator_reset_failed', { error: err.message });
        return reply.code(500).send(errorResponse('RESET_FAILED', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/validate-gate ──────────────────

  app.post(
    '/api/orchestrator/validate-gate',
    { schema: { tags: ['orchestrator'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (!body || !Array.isArray(body.deliverables) || body.deliverables.length === 0) {
          return reply
            .code(400)
            .send(
              errorResponse('INVALID_INPUT', 'deliverables array is required and must not be empty')
            );
        }
        const deliverables = body.deliverables.map((d) => String(d));
        const engine = getEngine();
        const result = engine.validateGate(deliverables);

        // Emit gate timeline event (M15-025)
        const activeSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (activeSession) {
          const gateType = result.verdict === 'APPROVED' ? 'gate_passed' : 'gate_failed';
          sessionTracker.addTimelineEvent(activeSession.id, {
            type: gateType,
            description: `Gate ${result.verdict}: ${result.summary.phase}`,
            phase: result.summary.phase,
            metadata: { verdict: result.verdict, violations: result.summary.totalViolations },
          });
          sseNotify(gateType, {
            type: gateType,
            session_id: activeSession.id,
            phase: result.summary.phase,
            verdict: result.verdict,
            violations: result.summary.totalViolations,
            timestamp: new Date().toISOString(),
          });
        }

        structuredLog(result.verdict === 'APPROVED' ? 'info' : 'warn', 'orchestrator_gate_result', {
          verdict: result.verdict,
          phase: result.summary.phase,
          violations: result.summary.totalViolations,
        });
        return reply.send({ ok: true, ...result });
      } catch (err) {
        structuredLog('error', 'orchestrator_validate_gate_error', { error: err.message });
        return reply.code(500).send(errorResponse('GATE_VALIDATION_ERROR', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/command ─────────────────────────

  app.post(
    '/api/orchestrator/command',
    { schema: { tags: ['orchestrator'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (!body || !body.command) {
          return reply.code(400).send(errorResponse('INVALID_INPUT', 'command is required'));
        }

        const VALID_COMMANDS = [
          'CREATE',
          'CREATE_BUSINESS',
          'CREATE_TECH',
          'CREATE_UX',
          'CREATE_MARKETING',
          'AUDIT',
          'FEATURE',
          'SCOPE_CHANGE',
          'HOTFIX',
          'REEVALUATE',
        ];
        const command = String(body.command)
          .toUpperCase()
          .replace(/[\s-]+/g, '_');
        if (!VALID_COMMANDS.includes(command)) {
          return reply
            .code(400)
            .send(
              errorResponse(
                'INVALID_COMMAND',
                `Unknown command "${body.command}". Valid: ${VALID_COMMANDS.join(', ')}`
              )
            );
        }

        const platform = body.platform ? String(body.platform).toLowerCase() : 'copilot';
        const validPlatforms = ['copilot', 'claude', 'codex'];
        if (!validPlatforms.includes(platform)) {
          return reply
            .code(400)
            .send(
              errorResponse(
                'INVALID_PLATFORM',
                `Unknown platform "${body.platform}". Valid: ${validPlatforms.join(', ')}`
              )
            );
        }

        const resume = Boolean(body.resume);
        const project = body.project ? String(body.project).slice(0, 200) : null;
        const template = body.template ? String(body.template).slice(0, 100) : undefined;

        // Apply template selection when starting fresh
        if (template && !resume) {
          _templateName = template;
          _engine = null;
        }
        const engine = getEngine();

        if (!resume) {
          engine.reset(command);

          // Seed decision templates into BusinessDocs/ if decisions/ doesn't exist yet
          const businessDocsDir = path.resolve(process.cwd(), 'BusinessDocs');
          try {
            const seedResult = seedDecisions(_templateName, businessDocsDir);
            if (seedResult.seeded) {
              structuredLog('info', 'orchestrator_decisions_seeded', {
                files: seedResult.files.length,
                indexFile: seedResult.indexFile,
              });
            }
          } catch (seedErr) {
            structuredLog('warn', 'orchestrator_decisions_seed_failed', {
              error: seedErr.message,
            });
          }
        }

        const st = engine.status();
        structuredLog('info', 'orchestrator_command', {
          command,
          platform,
          project,
          resume,
          state: st.state,
          mode: st.mode,
        });

        return reply.send({
          ok: true,
          command,
          project,
          platform,
          resume,
          status: st,
        });
      } catch (err) {
        structuredLog('error', 'orchestrator_command_error', { error: err.message });
        return reply.code(500).send(errorResponse('COMMAND_ERROR', err.message));
      }
    }
  );

  // ── GET /api/orchestrator/run-history ────────────────────────

  app.get(
    '/api/orchestrator/run-history',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        const runs = engine.runHistory();
        return reply.send({ ok: true, runs });
      } catch (err) {
        structuredLog('error', 'orchestrator_run_history_error', { error: err.message });
        return reply.code(500).send(errorResponse('RUN_HISTORY_ERROR', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/stop ─────────────────────────────

  app.post(
    '/api/orchestrator/stop',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        const st = engine.stop();
        return reply.send({ ok: true, stopped: true, status: st });
      } catch (err) {
        structuredLog('error', 'orchestrator_stop_failed', { error: err.message });
        return reply.code(500).send(errorResponse('STOP_FAILED', err.message));
      }
    }
  );

  // ── POST /api/orchestrator/sprint-gate ────────────────────

  app.post(
    '/api/orchestrator/sprint-gate',
    { schema: { tags: ['orchestrator'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (!body || !body.sprintId) {
          return reply.code(400).send(errorResponse('INVALID_INPUT', 'sprintId is required'));
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
        return reply.send({ ok: true, ...result });
      } catch (err) {
        structuredLog('error', 'orchestrator_sprint_gate_error', { error: err.message });
        return reply.code(500).send(errorResponse('SPRINT_GATE_ERROR', err.message));
      }
    }
  );

  // Expose getEngine for cross-route wiring
  ctx._getEngine = getEngine;
}
