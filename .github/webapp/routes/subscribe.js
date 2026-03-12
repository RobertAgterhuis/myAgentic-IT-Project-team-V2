// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Newsletter subscribe endpoint — server-side Buttondown ESP integration.
 * Privacy-first: API key never exposed to client, no tracking pixels.
 * @module routes/subscribe
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

const path = require('path');
const fs = require('fs');
const { errorResponse } = require('../utils/errors');
const { structuredLog, json, parseBody } = require('../middleware');

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

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

function pickMetadataString(metadata, key, fallback) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : fallback;
}

function parseAndValidateInput(parsed) {
  const { email, metadata } = parsed;

  if (!isValidEmail(email)) {
    return {
      ok: false,
      response: {
        status: 400,
        body: errorResponse('INVALID_INPUT', 'Please provide a valid email address.'),
      },
    };
  }

  const segment = pickMetadataString(metadata, 'segment', 'evaluators');
  if (!VALID_SEGMENTS.includes(segment)) {
    return {
      ok: false,
      response: {
        status: 400,
        body: errorResponse('INVALID_INPUT', `Segment must be one of: ${VALID_SEGMENTS.join(', ')}`),
      },
    };
  }

  const source = pickMetadataString(metadata, 'source', 'direct').slice(0, 100);

  return {
    ok: true,
    value: { email, segment, source },
  };
}

function readLocalSubscriptions() {
  if (!fs.existsSync(LOCAL_SUBS_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(LOCAL_SUBS_FILE, 'utf-8'));
}

function handleLocalFallback(res, email, segment, source) {
  structuredLog('info', 'subscribe_local_fallback', { email: '[redacted]', segment, source });
  try {
    const subs = readLocalSubscriptions();
    if (subs.some((s) => s.email === email)) {
      return json(res, 409, {
        error: 'already_subscribed',
        message: 'This email is already subscribed (local).',
      });
    }
    subs.push({ email, segment, source, subscribedAt: new Date().toISOString() });
    fs.writeFileSync(LOCAL_SUBS_FILE, JSON.stringify(subs, null, 2));
  } catch (writeErr) {
    structuredLog('error', 'subscribe_local_write_error', { message: writeErr.message });
  }

  return json(res, 201, {
    status: 'stored_locally',
    message: 'Newsletter service not configured. Subscription recorded locally.',
  });
}

async function handleUpstreamResponse(res, upstream, segment, source) {
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

  return json(
    res,
    502,
    errorResponse(
      'INTERNAL_ERROR',
      'Newsletter service returned an error. Please try again later.'
    )
  );
}

module.exports = function createSubscribeRoutes(_ctx) {
  async function handleSubscribe(req, res) {
    let parsed;
    try {
      parsed = await parseBody(req);
    } catch (err) {
      const code = err.errorCode || 'VALIDATION_ERROR';
      const status = err.status || 400;
      return json(res, status, errorResponse(code, err.message));
    }

    const validation = parseAndValidateInput(parsed);
    if (!validation.ok) {
      return json(res, validation.response.status, validation.response.body);
    }

    const { email, segment, source } = validation.value;

    const apiKey = process.env.BUTTONDOWN_API_KEY;
    if (!apiKey) {
      return handleLocalFallback(res, email, segment, source);
    }

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
      });
      return handleUpstreamResponse(res, upstream, segment, source);
    } catch (err) {
      structuredLog('error', 'subscribe_network_error', { message: err.message });
      return json(
        res,
        502,
        errorResponse(
          'INTERNAL_ERROR',
          'Could not reach newsletter service. Please try again later.'
        )
      );
    }
  }

  return {
    'POST /api/subscribe': handleSubscribe,
  };
};
