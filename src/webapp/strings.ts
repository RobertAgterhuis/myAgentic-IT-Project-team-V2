// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Centralized user-facing strings for the server layer.
 * Keeps all human-readable messages in one place for maintainability.
 * Frontend strings live in the STRINGS constant inside index.html <script>.
 */

/* ── Validation messages ──────────────────────────────────────── */

export const VALIDATION = {
  UPDATES_RANGE: 'updates must be 1–200 items',
  EVENTS_RANGE: 'events must be 1–100 items',
  EVENT_MUST_BE_OBJECT: 'Event must be an object',
  MISSING_CREATE_FIELDS: 'Missing type, priority, scope, or text',
  INVALID_TYPE: 'Invalid type',
  INVALID_PRIORITY: 'Invalid priority',
  MISSING_ID_OR_ANSWER: 'Missing id or answer',
  MISSING_ID: 'Missing id',
  INVALID_DEC_ID: 'Invalid decision ID format',
  MISSING_LESSON_ID: 'Missing lessonId',
  INVALID_LESSON_ID: 'Invalid lesson ID format (expected L followed by digits)',
  invalidQID: (id: string) => `Invalid Q-ID: ${id}`,
  invalidStatus: (s: string) => `Invalid status: ${s}`,
};

/* ── API response messages ────────────────────────────────────── */

export const RESPONSES = {
  reevaluateTrigger: (scope: string) =>
    `Trigger written. Type REEVALUATE ${scope} in Copilot chat.`,
  commandQueued: (text: string) => `Command queued. Paste in Copilot Chat: ${text}`,
  unknownEvent: (type: string) => `Unknown event type: ${type}`,
  unknownAction: (action: string) => `Unknown action: ${action}`,
  unknownCommand: (cmd: string) => `Unknown command: ${cmd}`,
};

/* ── Static content strings ───────────────────────────────────── */

export const STATIC = {
  NOT_FOUND: 'Not found',
};
