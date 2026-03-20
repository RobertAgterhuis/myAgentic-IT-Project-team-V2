'use strict';

const { toLegacyCtx } = require('../../src/webapp/context');

describe('context legacy adapter', () => {
  it('converts typed context to legacy record shape', () => {
    const ctx = { PROJECT_ROOT: '/tmp/project', PORT: 3000 };

    const legacy = toLegacyCtx(ctx);

    expect(legacy).toBe(ctx);
    expect(legacy.PROJECT_ROOT).toBe('/tmp/project');
    expect(legacy.PORT).toBe(3000);
  });

  it('handles empty context', () => {
    const ctx = {};
    const legacy = toLegacyCtx(ctx);
    expect(legacy).toEqual({});
  });

  it('preserves all properties in context', () => {
    const ctx = {
      PROJECT_ROOT: '/opt/myapp',
      PORT: 8080,
      DEBUG: true,
      CUSTOM_VAR: 'value',
    };
    const legacy = toLegacyCtx(ctx);
    expect(Object.keys(legacy)).toHaveLength(4);
    expect(legacy.DEBUG).toBe(true);
    expect(legacy.CUSTOM_VAR).toBe('value');
  });

  it('handles numeric and boolean values in context', () => {
    const ctx = {
      PORT: 3000,
      WORKERS: 4,
      DEBUG: true,
      VERBOSE: false,
      TIMEOUT_MS: 5000,
    };
    const legacy = toLegacyCtx(ctx);
    expect(legacy.PORT).toBe(3000);
    expect(legacy.WORKERS).toBe(4);
    expect(legacy.DEBUG).toBe(true);
    expect(legacy.VERBOSE).toBe(false);
    expect(legacy.TIMEOUT_MS).toBe(5000);
  });

  it('preserves null and undefined values', () => {
    const ctx = {
      DEFINED: 'value',
      NULL_VAL: null,
      UNDEF_VAL: undefined,
    };
    const legacy = toLegacyCtx(ctx);
    expect(legacy.DEFINED).toBe('value');
    expect(legacy.NULL_VAL).toBeNull();
    expect(legacy.UNDEF_VAL).toBeUndefined();
  });

  it('handles nested objects in context', () => {
    const nested = { level1: { level2: 'value' } };
    const ctx = { CONFIG: nested };
    const legacy = toLegacyCtx(ctx);
    expect(legacy.CONFIG.level1.level2).toBe('value');
    expect(legacy.CONFIG.level1).toBe(nested.level1);
  });

  it('handles arrays in context', () => {
    const ctx = { PATHS: ['/path1', '/path2', '/path3'] };
    const legacy = toLegacyCtx(ctx);
    expect(legacy.PATHS).toHaveLength(3);
    expect(legacy.PATHS[0]).toBe('/path1');
  });
});
