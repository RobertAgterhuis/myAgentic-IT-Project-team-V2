// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Command queue route handlers — POST/GET /api/command.
 *
 * Thin HTTP wrapper over CommandService (M20-003).
 *
 * @module routes/commands
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import { CommandService, ServiceValidationError, toServiceContext } from '../services';
import { attachSecretWarnings } from '../utils/secret-utils';
import { errorResponse } from '../utils/errors';
import { RESPONSES as R } from '../strings';
import { structuredLog, json, parseBody, assertString, checkSecretsInBody } from '../middleware';

const COMMAND_OPT_FIELDS = ['project', 'description', 'scope', 'brief'];
const COMMAND_OPT_LIMITS = { project: 200, description: 2000, scope: 200, brief: 200000 };

export = function createCommandRoutes(ctx): Record<string, unknown> {
  const { sseNotify } = ctx;

  const svc = new CommandService(toServiceContext(ctx));

  async function apiPostCommand(req, res) {
    const body = await parseBody(req);
    assertString(body.command, 'command', 100);
    for (const f of COMMAND_OPT_FIELDS) {
      if (body[f]) assertString(body[f], f, COMMAND_OPT_LIMITS[f]);
    }

    const cmdSecrets = checkSecretsInBody(body, ['description', 'brief']);
    if (cmdSecrets.length > 0)
      structuredLog('warn', 'secret_pattern_in_command', {
        patterns: cmdSecrets,
        command: body.command,
      });

    try {
      const result = await svc.queue(
        {
          command: body.command as string,
          project: body.project as string | undefined,
          description: body.description as string | undefined,
          scope: body.scope as string | undefined,
          brief: body.brief as string | undefined,
        },
        'webapp'
      );

      sseNotify('command_queued', {
        type: 'command_queued',
        command: (body.command as string).trim(),
        project: result.clipboard_text,
        timestamp: new Date().toISOString(),
      });

      const cmdResponse = {
        ok: true,
        clipboard_text: result.clipboard_text,
        brief_saved: result.brief_saved,
        message: R.commandQueued(result.clipboard_text),
      };
      attachSecretWarnings(cmdResponse, cmdSecrets);
      json(res, 200, cmdResponse);
    } catch (e) {
      if (e instanceof ServiceValidationError) {
        return json(
          res,
          400,
          errorResponse('UNKNOWN_COMMAND', R.unknownCommand(body.command as string))
        );
      }
      throw e;
    }
  }

  async function apiGetCommand(_req, res) {
    const queue = svc.getQueue();
    json(res, 200, { command: svc.getLatest(), queue });
  }

  // Expose helpers for cross-module use (progress needs getLatestCommand + readCommandQueue)
  const routes: Record<string, unknown> = {
    'POST /api/command': apiPostCommand,
    'GET /api/command': apiGetCommand,
  };
  routes._readCommandQueue = () => svc.getQueue();
  routes._getLatestCommand = () => svc.getLatest();
  return routes;
};
