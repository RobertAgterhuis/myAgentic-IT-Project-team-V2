describe('runtime adapter modules', () => {
  describe('profile helpers', () => {
    it('deriveEnvScope maps profile prefixes correctly', async () => {
      const { deriveEnvScope } = await import('../../platform/engine/runtime-adapter/profile.ts');

      expect(deriveEnvScope(undefined)).toBe('dev');
      expect(deriveEnvScope('local-dev')).toBe('dev');
      expect(deriveEnvScope('test-smoke')).toBe('test');
      expect(deriveEnvScope('production-single-node')).toBe('prod');
    });

    it('shouldFallbackProvider matches transient provider errors', async () => {
      const { shouldFallbackProvider } =
        await import('../../platform/engine/runtime-adapter/profile.ts');

      expect(shouldFallbackProvider(new Error('API key missing'))).toBe(true);
      expect(shouldFallbackProvider(new Error('network timeout'))).toBe(true);
      expect(shouldFallbackProvider(new Error('provider not found'))).toBe(true);
      expect(shouldFallbackProvider(new Error('deterministic contract violation'))).toBe(false);
      expect(shouldFallbackProvider('timed out')).toBe(true);
    });
  });

  describe('adapter resolution', () => {
    function makeRegistry(map = {}) {
      return {
        get(name) {
          return map[name];
        },
        listNames() {
          return Object.keys(map);
        },
      };
    }

    it('returns explicit adapter when registered', async () => {
      const { resolveAdapterSelection } =
        await import('../../platform/engine/runtime-adapter/adapter-resolution.ts');

      const adapter = { name: 'llm-openai' };
      const result = resolveAdapterSelection({
        adapterName: 'llm-openai',
        profile: 'local-dev',
        registry: makeRegistry({ 'llm-openai': adapter }),
      });

      expect(result.error).toBeNull();
      expect(result.adapter).toBe(adapter);
    });

    it('errors on unknown explicit adapter', async () => {
      const { resolveAdapterSelection } =
        await import('../../platform/engine/runtime-adapter/adapter-resolution.ts');

      const result = resolveAdapterSelection({
        adapterName: 'missing',
        profile: 'local-dev',
        registry: makeRegistry({}),
      });

      expect(result.adapter).toBeNull();
      expect(result.error).toMatch(/not registered/i);
    });

    it('blocks disallowed adapters in production profile', async () => {
      const { resolveAdapterSelection } =
        await import('../../platform/engine/runtime-adapter/adapter-resolution.ts');

      const result = resolveAdapterSelection({
        adapterName: 'null',
        profile: 'production-single-node',
        registry: makeRegistry({ null: { name: 'null' } }),
      });

      expect(result.adapter).toBeNull();
      expect(result.error).toMatch(/forbids/i);
    });

    it('requires explicit adapter in production when not configured', async () => {
      const { resolveAdapterSelection } =
        await import('../../platform/engine/runtime-adapter/adapter-resolution.ts');

      const result = resolveAdapterSelection({
        profile: 'production-single-node',
        registry: makeRegistry({}),
      });

      expect(result.adapter).toBeNull();
      expect(result.error).toMatch(/requires AGENT_RUNTIME_ADAPTER/i);
    });

    it('selects ci-test default adapter when profile is ci-test', async () => {
      const { resolveAdapterSelection } =
        await import('../../platform/engine/runtime-adapter/adapter-resolution.ts');

      const nullAdapter = { name: 'null' };
      const logOnlyAdapter = { name: 'log-only' };

      const result = resolveAdapterSelection({
        profile: 'ci-test',
        registry: makeRegistry({ null: nullAdapter, 'log-only': logOnlyAdapter }),
      });

      expect(result.error).toBeNull();
      expect(result.adapter).toBe(nullAdapter);
    });
  });

  describe('prompt assembly', () => {
    it('returns null retrieved context block when no matches are present', async () => {
      const { formatRetrievedContextBlock } =
        await import('../../platform/engine/runtime-adapter/prompt-assembly.ts');

      expect(formatRetrievedContextBlock(null)).toBeNull();
      expect(formatRetrievedContextBlock({ query: 'q', collections: [], matches: [] })).toBeNull();
    });

    it('formats retrieved context with explicit advisory framing', async () => {
      const { formatRetrievedContextBlock } =
        await import('../../platform/engine/runtime-adapter/prompt-assembly.ts');

      const text = formatRetrievedContextBlock({
        query: 'security controls',
        collections: ['decisions'],
        matches: [
          { source: 'a.md:L12', excerpt: 'retrieved line', collection: 'decisions', score: 0.8 },
        ],
      });

      expect(text).toContain('[RETRIEVED CONTEXT]');
      expect(text).toContain('non-authoritative background context');
      expect(text).toContain('Query: security controls');
      expect(text).toContain('retrieved line');
    });

    it('buildPromptEnvelope returns system+user base messages', async () => {
      const { buildPromptEnvelope } =
        await import('../../platform/engine/runtime-adapter/prompt-assembly.ts');

      const { promptEnvelope, baseMessages } = buildPromptEnvelope({
        requestId: 'r1',
        requestedAt: new Date().toISOString(),
        agent: { id: '05', name: 'Architect' },
        platform: 'copilot',
        skillPath: 'templates/sdlc/skill.md',
        sanitizedSkillContent: 'Follow checklist.',
        contextTokenBudget: 1000,
        predecessorOutputs: [],
        predecessorContracts: [],
        questionnaireInput: null,
        ragContext: null,
        sessionState: null,
        contextBlocks: [],
        contractPaths: [],
      });

      expect(promptEnvelope.prompt.system).toContain('You are executing SDLC agent 05');
      expect(promptEnvelope.prompt.user).toContain('Use the invocation envelope below');
      expect(baseMessages).toHaveLength(2);
      expect(baseMessages[0].role).toBe('system');
      expect(baseMessages[1].role).toBe('user');
    });

    it('buildPromptEnvelope surfaces revision context in system prompt and envelope', async () => {
      const { buildPromptEnvelope } =
        await import('../../platform/engine/runtime-adapter/prompt-assembly.ts');

      const { promptEnvelope } = buildPromptEnvelope({
        requestId: 'r1-revision',
        requestedAt: new Date().toISOString(),
        agent: { id: '06', name: 'Senior Developer' },
        platform: 'copilot',
        skillPath: 'templates/sdlc/skill.md',
        sanitizedSkillContent: 'Revise the artifact.',
        contextTokenBudget: 1000,
        predecessorOutputs: [],
        predecessorContracts: [],
        questionnaireInput: null,
        ragContext: null,
        sessionState: null,
        revisionContext: {
          eventId: 'SRE-1',
          attempt: 1,
          maxAttempts: 2,
          trigger: 'quality-below-threshold',
          instructions: [{ heading: 'Improve Deliverable Quality', directive: 'Add evidence.' }],
          findingsAddressed: [],
          estimatedImpact: 'medium',
          priorFailure: 'Quality score below threshold.',
        },
        contextBlocks: [],
        contractPaths: [],
      });

      expect(promptEnvelope.prompt.system).toContain('self-revision attempt 1 of 2');
      expect(promptEnvelope.context.revisionContext?.eventId).toBe('SRE-1');
    });

    it('buildPromptEnvelope includes explicit contract reference text when paths are provided', async () => {
      const { buildPromptEnvelope } =
        await import('../../platform/engine/runtime-adapter/prompt-assembly.ts');

      const { promptEnvelope } = buildPromptEnvelope({
        requestId: 'r2',
        requestedAt: new Date().toISOString(),
        agent: { id: '06', name: 'Senior Developer' },
        platform: 'copilot',
        skillPath: null,
        sanitizedSkillContent: 'Implement feature.',
        contextTokenBudget: 1000,
        predecessorOutputs: [],
        predecessorContracts: [],
        questionnaireInput: null,
        ragContext: null,
        sessionState: null,
        contextBlocks: [],
        contractPaths: ['templates/sdlc/contracts/test-contract.md'],
      });

      expect(promptEnvelope.prompt.user).toContain('Referenced contracts:');
      expect(promptEnvelope.prompt.user).toContain('test-contract.md');
    });

    it('buildPromptEnvelope embeds retrieved context block when matches exist', async () => {
      const { buildPromptEnvelope } =
        await import('../../platform/engine/runtime-adapter/prompt-assembly.ts');

      const { promptEnvelope } = buildPromptEnvelope({
        requestId: 'r3',
        requestedAt: new Date().toISOString(),
        agent: { id: '07', name: 'QA' },
        platform: 'copilot',
        skillPath: null,
        sanitizedSkillContent: 'Validate implementation.',
        contextTokenBudget: 1000,
        predecessorOutputs: [],
        predecessorContracts: [],
        questionnaireInput: null,
        ragContext: {
          query: 'testing strategy',
          collections: ['codebase'],
          matches: [
            {
              source: 'tests/unit/sample.test.js:L10',
              excerpt: 'assertions should be deterministic',
              collection: 'codebase',
              score: 0.9,
            },
          ],
        },
        sessionState: null,
        contextBlocks: [],
        contractPaths: [],
      });

      expect(promptEnvelope.prompt.user).toContain('[RETRIEVED CONTEXT]');
      expect(promptEnvelope.prompt.user).toContain('testing strategy');
      expect(promptEnvelope.prompt.user).toContain('assertions should be deterministic');
    });
  });

  describe('tool loop', () => {
    it('executes tool calls and feeds tool results back to provider', async () => {
      const { completeWithToolExecution } =
        await import('../../platform/engine/runtime-adapter/tool-loop.ts');

      const calls = [];
      const provider = {
        complete: vi
          .fn()
          .mockImplementationOnce(async () => ({
            model: 'm',
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            content: '',
            toolCalls: [{ id: '1', name: 'git.status', arguments: {} }],
          }))
          .mockImplementationOnce(async () => ({
            model: 'm',
            finishReason: 'stop',
            usage: { promptTokens: 2, completionTokens: 2, totalTokens: 4 },
            content: 'done',
            toolCalls: [],
          })),
      };

      const middleware = {
        listToolDefinitionsForPolicy: vi.fn(() => [{ name: 'git.status' }]),
        execute: vi.fn(async () => ({
          success: true,
          adapter: 'git',
          operation: 'status',
          data: { ok: true },
          error: null,
          fromCache: false,
        })),
      };

      const result = await completeWithToolExecution({
        provider,
        messages: [{ role: 'user', content: 'start' }],
        maxTokens: 256,
        temperature: 0,
        policy: { traceId: 't1' },
        createMiddleware: () => middleware,
        sanitizeForPrompt: (v) => v,
        toolAuditSink: {
          logToolExecution(event) {
            calls.push(event);
          },
        },
      });

      expect(result.completion.content).toBe('done');
      expect(provider.complete).toHaveBeenCalledTimes(2);
      expect(middleware.execute).toHaveBeenCalledTimes(1);
    });

    it('captures middleware audit events into sink and result list', async () => {
      const { completeWithToolExecution } =
        await import('../../platform/engine/runtime-adapter/tool-loop.ts');

      const sinkEvents = [];
      const provider = {
        complete: vi
          .fn()
          .mockImplementationOnce(async () => ({
            model: 'm',
            finishReason: 'tool_calls',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            content: '',
            toolCalls: [{ id: '1', name: 'git.status', arguments: {} }],
          }))
          .mockImplementationOnce(async () => ({
            model: 'm',
            finishReason: 'stop',
            usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
            content: 'done',
            toolCalls: [],
          })),
      };

      const middlewareFactory = ({ logToolExecution }) => ({
        listToolDefinitionsForPolicy: vi.fn(() => [{ name: 'git.status' }]),
        execute: vi.fn(async () => {
          logToolExecution({
            timestamp: new Date().toISOString(),
            toolName: 'git.status',
            action: 'status',
            success: true,
            source: 'adapter',
            traceId: 't5',
          });
          return {
            success: true,
            adapter: 'git',
            operation: 'status',
            data: { ok: true },
            error: null,
            fromCache: false,
          };
        }),
      });

      const result = await completeWithToolExecution({
        provider,
        messages: [{ role: 'user', content: 'start' }],
        maxTokens: 256,
        temperature: 0,
        policy: { traceId: 't5' },
        createMiddleware: middlewareFactory,
        sanitizeForPrompt: (v) => v,
        toolAuditSink: {
          logToolExecution(event) {
            sinkEvents.push(event);
          },
        },
      });

      expect(result.toolAuditEvents).toHaveLength(1);
      expect(sinkEvents).toHaveLength(1);
    });

    it('throws round-limit error when model keeps requesting tools', async () => {
      const { completeWithToolExecution } =
        await import('../../platform/engine/runtime-adapter/tool-loop.ts');

      const provider = {
        complete: vi.fn(async () => ({
          model: 'm',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          content: '',
          toolCalls: [{ id: '1', name: 'x', arguments: {} }],
        })),
      };

      const middleware = {
        listToolDefinitionsForPolicy: vi.fn(() => []),
        execute: vi.fn(async () => ({
          success: true,
          adapter: 'x',
          operation: 'y',
          data: {},
          error: null,
          fromCache: false,
        })),
      };

      await expect(
        completeWithToolExecution({
          provider,
          messages: [{ role: 'user', content: 'start' }],
          maxTokens: 256,
          temperature: 0,
          policy: { traceId: 't2' },
          maxToolRounds: 1,
          createMiddleware: () => middleware,
          sanitizeForPrompt: (v) => v,
        })
      ).rejects.toThrow(/TOOL_ROUND_LIMIT_EXCEEDED/);
    });

    it('maps ToolAuthorizationError to code-prefixed error message', async () => {
      const { completeWithToolExecution } =
        await import('../../platform/engine/runtime-adapter/tool-loop.ts');
      const { ToolAuthorizationError } =
        await import('../../platform/engine/tool-execution-middleware.ts');

      const provider = {
        complete: vi.fn(async () => ({
          model: 'm',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          content: '',
          toolCalls: [{ id: '1', name: 'x', arguments: {} }],
        })),
      };

      const middleware = {
        listToolDefinitionsForPolicy: vi.fn(() => []),
        execute: vi.fn(async () => {
          throw new ToolAuthorizationError('blocked by policy');
        }),
      };

      await expect(
        completeWithToolExecution({
          provider,
          messages: [{ role: 'user', content: 'start' }],
          maxTokens: 256,
          temperature: 0,
          policy: { traceId: 't3' },
          createMiddleware: () => middleware,
          sanitizeForPrompt: (v) => v,
        })
      ).rejects.toThrow(/TOOL_POLICY_BLOCKED|TOOL_AUTHORIZATION_FAILED|blocked by policy/);
    });

    it('rethrows non-policy execution errors unchanged', async () => {
      const { completeWithToolExecution } =
        await import('../../platform/engine/runtime-adapter/tool-loop.ts');

      const provider = {
        complete: vi.fn(async () => ({
          model: 'm',
          finishReason: 'tool_calls',
          usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
          content: '',
          toolCalls: [{ id: '1', name: 'x', arguments: {} }],
        })),
      };

      const middleware = {
        listToolDefinitionsForPolicy: vi.fn(() => []),
        execute: vi.fn(async () => {
          throw new Error('boom');
        }),
      };

      await expect(
        completeWithToolExecution({
          provider,
          messages: [{ role: 'user', content: 'start' }],
          maxTokens: 256,
          temperature: 0,
          policy: { traceId: 't4' },
          createMiddleware: () => middleware,
          sanitizeForPrompt: (v) => v,
        })
      ).rejects.toThrow('boom');
    });
  });
});
