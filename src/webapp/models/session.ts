// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Session / pipeline model — parsing helpers for session-state JSON.
 */

/**
 * Parse a session-state JSON string into an object.
 */
export function parseSessionState(content: string): unknown {
  if (!content) return null;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}
