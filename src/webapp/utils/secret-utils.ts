// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Secret-detection shared utilities.
 * Consolidates the repeated secret-warning formatting pattern
 * used across apiSave, apiPostDecision, and apiPostCommand.
 */

const SECRET_WARNING_TEMPLATE =
  'Possible secrets detected ($NAMES). Please verify no sensitive data was submitted.';

export function formatSecretWarnings(warnings: string[]): string[] {
  if (!warnings || warnings.length === 0) return [];
  return [SECRET_WARNING_TEMPLATE.replace('$NAMES', warnings.join(', '))];
}

export function attachSecretWarnings(
  response: Record<string, unknown>,
  warnings: string[]
): Record<string, unknown> {
  const formatted = formatSecretWarnings(warnings);
  if (formatted.length > 0) response.warnings = formatted;
  return response;
}
