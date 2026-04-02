import { completeWithToolExecution } from '../../platform/engine/runtime-adapter/tool-loop';

describe('completeWithToolExecution', () => {
  it('blocks fanout amplification when tool calls exceed per-round limit', async () => {
    const provider = {
      complete: vi.fn().mockResolvedValue({
        content: 'needs tools',
        model: 'gpt-test',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: 'tool_calls',
        toolCalls: [
          { id: '1', name: 'tool.git.status', arguments: {} },
          { id: '2', name: 'tool.git.status', arguments: {} },
          { id: '3', name: 'tool.git.status', arguments: {} },
          { id: '4', name: 'tool.git.status', arguments: {} },
        ],
      }),
    };

    const middleware = {
      listToolDefinitionsForPolicy: vi.fn().mockReturnValue([]),
      execute: vi.fn(),
    };

    await expect(
      completeWithToolExecution({
        provider,
        messages: [{ role: 'user', content: 'run tools' }],
        maxTokens: 100,
        temperature: 0,
        policy: { traceId: 'trace-fanout' },
        maxToolCallsPerRound: 3,
        createMiddleware: () => middleware,
        sanitizeForPrompt: (value) => value,
      })
    ).rejects.toThrow(/TOOL_FANOUT_LIMIT_EXCEEDED/);
  });

  it('executes tools successfully when fanout is within guardrail', async () => {
    const provider = {
      complete: vi
        .fn()
        .mockResolvedValueOnce({
          content: 'needs tools',
          model: 'gpt-test',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          finishReason: 'tool_calls',
          toolCalls: [{ id: '1', name: 'tool.git.status', arguments: {} }],
        })
        .mockResolvedValueOnce({
          content: 'done',
          model: 'gpt-test',
          usage: { promptTokens: 11, completionTokens: 6, totalTokens: 17 },
          finishReason: 'stop',
        }),
    };

    const middleware = {
      listToolDefinitionsForPolicy: vi.fn().mockReturnValue([]),
      execute: vi.fn().mockResolvedValue({
        success: true,
        adapter: 'git',
        operation: 'status',
        data: { clean: true },
      }),
    };

    const result = await completeWithToolExecution({
      provider,
      messages: [{ role: 'user', content: 'run tools' }],
      maxTokens: 100,
      temperature: 0,
      policy: { traceId: 'trace-ok' },
      maxToolCallsPerRound: 3,
      createMiddleware: () => middleware,
      sanitizeForPrompt: (value) => value,
    });

    expect(result.completion.finishReason).toBe('stop');
    expect(middleware.execute).toHaveBeenCalledTimes(1);
  });
});
