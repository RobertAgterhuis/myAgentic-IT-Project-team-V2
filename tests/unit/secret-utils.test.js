// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { describe, it, expect } from 'vitest';
import { formatSecretWarnings, attachSecretWarnings } from '../../src/webapp/utils/secret-utils';

describe('formatSecretWarnings', () => {
  it('returns empty array for null input', () => {
    expect(formatSecretWarnings(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(formatSecretWarnings(undefined)).toEqual([]);
  });

  it('returns empty array for empty array input', () => {
    expect(formatSecretWarnings([])).toEqual([]);
  });

  it('formats single warning', () => {
    const result = formatSecretWarnings(['AWS Access Key']);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('AWS Access Key');
    expect(result[0]).toContain('Possible secrets detected');
  });

  it('formats multiple warnings joined by comma', () => {
    const result = formatSecretWarnings(['AWS Access Key', 'GitHub Token']);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('AWS Access Key');
    expect(result[0]).toContain('GitHub Token');
  });

  it('handles three or more warnings', () => {
    const warnings = ['AWS Access Key', 'GitHub Token', 'Database Password'];
    const result = formatSecretWarnings(warnings);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('AWS Access Key');
    expect(result[0]).toContain('GitHub Token');
    expect(result[0]).toContain('Database Password');
  });
});

describe('attachSecretWarnings', () => {
  it('returns response with no warnings for empty warnings array', () => {
    const response = { status: 200 };
    const result = attachSecretWarnings(response, []);
    expect(result).toEqual({ status: 200 });
    expect(result.warnings).toBeUndefined();
  });

  it('attaches formatted warnings to response', () => {
    const response = { status: 200, data: {} };
    const result = attachSecretWarnings(response, ['AWS Access Key']);
    expect(result.warnings).toBeDefined();
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('AWS Access Key');
  });

  it('preserves existing response properties', () => {
    const response = { status: 200, data: { id: 'test-123' } };
    const result = attachSecretWarnings(response, ['GitHub Token']);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: 'test-123' });
    expect(result.warnings).toBeDefined();
  });

  it('returns same response object instance', () => {
    const response = { status: 200 };
    const result = attachSecretWarnings(response, ['Secret']);
    expect(result).toBe(response);
  });
});
