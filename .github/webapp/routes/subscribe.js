// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Newsletter subscribe endpoint — server-side Buttondown ESP integration.
 * Privacy-first: API key never exposed to client, no tracking pixels.
 * @module routes/subscribe
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

const { errorResponse } = require('../utils/errors');
const { structuredLog, json, parseBody } = require('../middleware');

const BUTTONDOWN_API = 'https://api.buttondown.email/v1/subscribers';
const VALID_SEGMENTS = ['engineering-leaders', 'product-managers', 'developers', 'evaluators'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = function createSubscribeRoutes(ctx) {
  async function handleSubscribe(req, res) {
    let parsed;
    try {
      parsed = await parseBody(req);
    } catch (err) {
      const code = err.errorCode || 'VALIDATION_ERROR';
      const status = err.status || 400;
      return json(res, status, errorResponse(code, err.message));
    }

    const { email, metadata } = parsed;

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return json(res, 400, errorResponse('INVALID_INPUT', 'Please provide a valid email address.'));
    }

    const segment = metadata && typeof metadata.segment === 'string'
      ? metadata.segment : 'evaluators';
    if (!VALID_SEGMENTS.includes(segment)) {
      return json(res, 400, errorResponse('INVALID_INPUT',
        `Segment must be one of: ${VALID_SEGMENTS.join(', ')}`));
    }

    const source = metadata && typeof metadata.source === 'string'
      ? metadata.source.slice(0, 100) : 'direct';

    const apiKey = process.env.BUTTONDOWN_API_KEY;
    if (!apiKey) {
      structuredLog('error', 'subscribe_error', { reason: 'BUTTONDOWN_API_KEY not configured' });
      return json(res, 503, errorResponse('INTERNAL_ERROR',
        'Newsletter service is not configured. Please try again later.'));
    }

    try {
      const upstream = await fetch(BUTTONDOWN_API, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          tags: [segment],
          metadata: { source },
          referrer_url: source,
        }),
      });

      if (upstream.status === 201) {
        structuredLog('info', 'subscribe_success', { segment, source });
        return json(res, 201, {
          status: 'pending_confirmation',
          message: 'Please check your email to confirm subscription.',
        });
      }

      if (upstream.status === 409) {
        return json(res, 409, {
          error: 'already_subscribed',
          message: 'This email is already subscribed.',
        });
      }

      const text = await upstream.text().catch(() => '');
      structuredLog('error', 'subscribe_upstream_error', {
        status: upstream.status,
        body: text.slice(0, 200),
      });
      return json(res, 502, errorResponse('INTERNAL_ERROR',
        'Newsletter service returned an error. Please try again later.'));
    } catch (err) {
      structuredLog('error', 'subscribe_network_error', { message: err.message });
      return json(res, 502, errorResponse('INTERNAL_ERROR',
        'Could not reach newsletter service. Please try again later.'));
    }
  }

  return {
    'POST /api/subscribe': handleSubscribe,
  };
};
