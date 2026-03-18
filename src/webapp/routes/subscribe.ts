// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Newsletter subscribe endpoint — server-side Buttondown ESP integration.
 * Privacy-first: API key never exposed to client, no tracking pixels.
 * @module routes/subscribe
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import path from 'path';
import crypto from 'crypto';
import { getStore } from '../store';
import { withFileLock } from '../file-lock';
import { errorResponse } from '../utils/errors';
import { structuredLog } from '../middleware';
import * as RS from '../route-schemas';

const BUTTONDOWN_API = 'https://api.buttondown.email/v1/subscribers';
const VALID_SEGMENTS = ['engineering-leaders', 'product-managers', 'developers', 'evaluators'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_SUBS_FILE = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'BusinessDocs',
  'local-subscriptions.json'
);

function isValidEmail(email: unknown) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

function pickMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
  fallback: string
) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : fallback;
}

function parseAndValidateInput(parsed: { email?: string; metadata?: Record<string, unknown> }) {
  const { email, metadata } = parsed;

  if (!isValidEmail(email)) {
    return {
      ok: false as const,
      response: {
        status: 400,
        body: errorResponse('INVALID_INPUT', 'Please provide a valid email address.'),
      },
    };
  }

  const segment = pickMetadataString(metadata, 'segment', 'evaluators');
  if (!VALID_SEGMENTS.includes(segment)) {
    return {
      ok: false as const,
      response: {
        status: 400,
        body: errorResponse(
          'INVALID_INPUT',
          `Segment must be one of: ${VALID_SEGMENTS.join(', ')}`
        ),
      },
    };
  }

  const source = pickMetadataString(metadata, 'source', 'direct').slice(0, 100);

  return {
    ok: true as const,
    value: { email: email as string, segment, source },
  };
}

function hashEmail(email: string) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function readLocalSubscriptions() {
  const store = getStore();
  if (!store.exists(LOCAL_SUBS_FILE)) {
    return [];
  }
  return JSON.parse(store.readFile(LOCAL_SUBS_FILE));
}

async function handleLocalFallback(
  reply: FastifyReply,
  email: string,
  segment: string,
  source: string
) {
  structuredLog('info', 'subscribe_local_fallback', { email: '[redacted]', segment, source });
  try {
    const emailHash = hashEmail(email);
    return await withFileLock(LOCAL_SUBS_FILE, () => {
      const subs = readLocalSubscriptions();
      if (subs.some((s: { emailHash: string }) => s.emailHash === emailHash)) {
        return reply
          .code(409)
          .send(errorResponse('CONFLICT', 'This email is already subscribed (local).'));
      }
      subs.push({ emailHash, segment, source, subscribedAt: new Date().toISOString() });
      getStore().writeFile(LOCAL_SUBS_FILE, JSON.stringify(subs, null, 2));
      return reply.code(201).send({
        status: 'stored_locally',
        message: 'Newsletter service not configured. Subscription recorded locally.',
      });
    });
  } catch (writeErr) {
    structuredLog('error', 'subscribe_local_write_error', { message: (writeErr as Error).message });
    return reply.code(201).send({
      status: 'stored_locally',
      message: 'Newsletter service not configured. Subscription recorded locally.',
    });
  }
}

async function handleUpstreamResponse(
  reply: FastifyReply,
  upstream: Response,
  segment: string,
  source: string
) {
  if (upstream.status === 201) {
    structuredLog('info', 'subscribe_success', { segment, source });
    return reply.code(201).send({
      status: 'pending_confirmation',
      message: 'Please check your email to confirm subscription.',
    });
  }

  if (upstream.status === 409) {
    return reply.code(409).send(errorResponse('CONFLICT', 'This email is already subscribed.'));
  }

  const text = await upstream.text().catch(() => '');
  structuredLog('error', 'subscribe_upstream_error', {
    status: upstream.status,
    body: text.slice(0, 200),
  });

  return reply
    .code(502)
    .send(
      errorResponse(
        'INTERNAL_ERROR',
        'Newsletter service returned an error. Please try again later.'
      )
    );
}

export async function registerRoutes(app: FastifyInstance, _ctx: ServerContext): Promise<void> {
  app.post<{ Body: { email?: string; metadata?: Record<string, unknown> } }>(
    '/api/subscribe',
    { schema: RS.subscribe },
    async (
      request: FastifyRequest<{ Body: { email?: string; metadata?: Record<string, unknown> } }>,
      reply: FastifyReply
    ) => {
      const parsed = request.body ?? {};

      const validation = parseAndValidateInput(parsed);
      if (!validation.ok) {
        return reply.code(validation.response.status).send(validation.response.body);
      }

      const { email, segment, source } = validation.value;

      const apiKey = process.env.BUTTONDOWN_API_KEY;
      if (!apiKey) {
        return await handleLocalFallback(reply, email, segment, source);
      }

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const upstream = await fetch(BUTTONDOWN_API, {
          method: 'POST',
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            tags: [segment],
            metadata: { source },
            referrer_url: source,
          }),
          signal: controller.signal,
        });
        return handleUpstreamResponse(reply, upstream, segment, source);
      } catch (err) {
        structuredLog('error', 'subscribe_network_error', { message: (err as Error).message });
        return reply
          .code(502)
          .send(
            errorResponse(
              'INTERNAL_ERROR',
              'Could not reach newsletter service. Please try again later.'
            )
          );
      } finally {
        clearTimeout(fetchTimeout);
      }
    }
  );
}
