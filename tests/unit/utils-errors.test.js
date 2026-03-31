'use strict';

const { errorResponse, ERROR_CATALOG, statusToCode } = require('../../src/webapp/utils/errors');

describe('ERROR_CATALOG', () => {
  it('is a non-empty record of error entries', () => {
    expect(typeof ERROR_CATALOG).toBe('object');
    expect(Object.keys(ERROR_CATALOG).length).toBeGreaterThan(10);
  });

  it('each entry has message and recovery fields', () => {
    for (const entry of Object.values(ERROR_CATALOG)) {
      expect(typeof entry.message).toBe('string');
      expect(typeof entry.recovery).toBe('string');
      expect(entry.message.length).toBeGreaterThan(0);
    }
  });

  it('contains expected core error codes', () => {
    const expected = [
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'INTERNAL_ERROR',
      'UNAUTHORIZED',
      'UNKNOWN_COMMAND',
    ];
    for (const code of expected) {
      expect(ERROR_CATALOG).toHaveProperty(code);
    }
  });
});

describe('errorResponse', () => {
  it('returns expected shape with known code', () => {
    const result = errorResponse('NOT_FOUND');
    expect(result.code).toBe('NOT_FOUND');
    expect(typeof result.error).toBe('string');
    expect(typeof result.recovery).toBe('string');
    expect(result.error).toBe(ERROR_CATALOG.NOT_FOUND.message);
  });

  it('uses detail message when provided', () => {
    const result = errorResponse('NOT_FOUND', 'custom detail');
    expect(result.error).toBe('custom detail');
    expect(result.code).toBe('NOT_FOUND');
  });

  it('falls back to INTERNAL_ERROR for unknown codes', () => {
    const result = errorResponse('TOTALLY_UNKNOWN_CODE_XYZ');
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.error).toBe(ERROR_CATALOG.INTERNAL_ERROR.message);
  });

  it('returns INTERNAL_ERROR with custom detail for unknown code', () => {
    const result = errorResponse('NONEXISTENT', 'Oh no something broke');
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.error).toBe('Oh no something broke');
  });

  it('handles all catalog codes correctly', () => {
    for (const code of Object.keys(ERROR_CATALOG)) {
      const result = errorResponse(code);
      expect(result.code).toBe(code);
    }
  });
});

describe('statusToCode', () => {
  it('maps known HTTP status codes', () => {
    expect(statusToCode(400)).toBe('VALIDATION_ERROR');
    expect(statusToCode(401)).toBe('UNAUTHORIZED');
    expect(statusToCode(403)).toBe('PATH_TRAVERSAL');
    expect(statusToCode(404)).toBe('NOT_FOUND');
    expect(statusToCode(405)).toBe('METHOD_NOT_ALLOWED');
    expect(statusToCode(409)).toBe('CONFLICT');
    expect(statusToCode(429)).toBe('RATE_LIMITED');
    expect(statusToCode(503)).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns INTERNAL_ERROR for unknown status codes (line 153)', () => {
    expect(statusToCode(418)).toBe('INTERNAL_ERROR');
    expect(statusToCode(500)).toBe('INTERNAL_ERROR');
    expect(statusToCode(0)).toBe('INTERNAL_ERROR');
    expect(statusToCode(999)).toBe('INTERNAL_ERROR');
  });
});
