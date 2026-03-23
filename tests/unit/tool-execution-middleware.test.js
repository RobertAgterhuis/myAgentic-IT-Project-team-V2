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

  it('lists tool definitions for non-admin policy without runtime manifest', () => {
    const middleware = new ToolExecutionMiddleware({
      toolExecutor: { execute: vi.fn() },
    });

    const defs = middleware.listToolDefinitionsForPolicy({
      role: 'viewer',
      profile: 'local-dev',
      agentId: 'agent-missing-manifest',
    });

    expect(Array.isArray(defs)).toBe(true);
    expect(defs.length).toBeGreaterThan(0);
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

  it('throws ToolAuthorizationError for viewer attempting mutating tool in production profile', async () => {
    const executeSpy = vi.fn();
    const middleware = new ToolExecutionMiddleware({
      toolExecutor: { execute: executeSpy },
    });

    await expect(
      middleware.execute(
        {
          id: 'tool-call-2',
          name: 'tool.files.write',
          arguments: {
            target: 'files',
            operation: 'write',
            params: { path: 'BusinessDocs/test.md', content: 'x' },
          },
        },
        { role: 'viewer', profile: 'production-single-node' }
      )
    ).rejects.toBeInstanceOf(ToolAuthorizationError);

    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('throws ToolValidationError when target/operation are missing', async () => {
    const middleware = new ToolExecutionMiddleware({
      toolExecutor: { execute: vi.fn() },
    });

    await expect(
      middleware.execute(
        {
          id: 'tool-call-3',
          name: 'tool.files.read',
          arguments: { params: { path: 'README.md' } },
        },
        { role: 'admin' }
      )
    ).rejects.toBeInstanceOf(ToolValidationError);
  });

  it('executes known tool successfully with normalized policy defaults', async () => {
    const executeSpy = vi.fn().mockResolvedValue({
      success: true,
      adapter: 'files',
      operation: 'read',
      data: { content: 'ok' },
      fromCache: false,
      duration_ms: 3,
    });

    const middleware = new ToolExecutionMiddleware({
      toolExecutor: { execute: executeSpy },
    });

    const result = await middleware.execute(
      {
        id: 'tool-call-4',
        name: 'tool.files.read',
        arguments: { target: 'files', operation: 'read', params: { path: 'README.md' } },
      },
      { role: 'viewer' }
    );

    expect(result.success).toBe(true);
    expect(executeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        target: 'files',
        operation: 'read',
        params: { path: 'README.md' },
      })
    );
  });
});
