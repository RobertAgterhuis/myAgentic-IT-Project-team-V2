// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Shared utility functions used across all domain model modules.
 */

/** Escape special regex characters in a string. */
export function escRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Today's date as YYYY-MM-DD. */
export function today(): string {
  return new Date().toISOString().split('T')[0];
}

/** Current timestamp in ISO 8601 format. */
export function isoNow(): string {
  return new Date().toISOString();
}

/** Escape pipe characters for safe markdown table embedding. */
export function escPipe(s: string): string {
  return (s || '').replace(/\|/g, '\\|');
}

/**
 * Replace a literal substring (no regex expansion of $ in replacement).
 */
export function literalReplace(str: string, search: string, replacement: string): string {
  return str.replace(search, () => replacement);
}

/** Regex for validating question IDs (e.g. Q-05-001). */
export const Q_ID_RE: RegExp = /^Q-\d{1,3}-\d{1,4}$/;
/** Regex for validating decision IDs (e.g. DEC-R2-001). */
export const DEC_ID_RE: RegExp = /^DEC-[\w-]{1,30}$/;
