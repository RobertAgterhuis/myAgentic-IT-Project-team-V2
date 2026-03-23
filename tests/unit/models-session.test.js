// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { parseSessionState } = require('../../src/webapp/models/session');

describe('parseSessionState', () => {
  it('returns a parsed object for valid JSON', () => {
    const result = parseSessionState('{"a":1,"b":"hello"}');
    expect(result).toEqual({ a: 1, b: 'hello' });
  });

  it('returns null for an empty string', () => {
    expect(parseSessionState('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseSessionState('not valid json')).toBeNull();
  });

  it('returns a parsed array for a JSON array string', () => {
    expect(parseSessionState('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns null for undefined (falsy shortcircuit)', () => {
    expect(parseSessionState(undefined)).toBeNull();
  });

  it('returns null for malformed JSON with unquoted keys', () => {
    expect(parseSessionState('{a:bad}')).toBeNull();
  });
});
