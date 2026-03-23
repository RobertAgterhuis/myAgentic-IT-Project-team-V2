'use strict';

const {
  ToolExecutionMiddleware,
  ToolAuthorizationError,
  ToolValidationError,
} = require('../../platform/engine/tool-execution-middleware');

describe('ToolExecutionMiddleware', () => {
  it('ToolAuthorizationError sets code/name/message', () => {
    const err = new ToolAuthorizationError('not allowed');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('TOOL_UNAUTHORIZED');
    expect(err.name).toBe('ToolAuthorizationError');
    expect(err.message).toBe('not allowed');
  });

  it('ToolValidationError sets code/name/message', () => {
    const err = new ToolValidationError('bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('TOOL_INVALID_REQUEST');
    expect(err.name).toBe('ToolValidationError');
    expect(err.message).toBe('bad input');
  });

  it('lists canonical tool definitions from catalog', () => {
    const middleware = new ToolExecutionMiddleware({
      toolExecutor: { execute: vi.fn() },
    });

    const defs = middleware.listToolDefinitions();
    expect(Array.isArray(defs)).toBe(true);
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        description: expect.any(String),
        parameters: expect.any(Object),
      })
    );
  });

  it('throws ToolValidationError when an unknown canonical tool is requested', async () => {
    const middleware = new ToolExecutionMiddleware({
      toolExecutor: { execute: vi.fn() },
    });

    await expect(
      middleware.execute({
        id: 'tool-call-1',
        name: 'tool.unknown.invalid',
        arguments: { target: 'git', operation: 'status' },
      })
    ).rejects.toBeInstanceOf(ToolValidationError);
  });
});
