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
});
