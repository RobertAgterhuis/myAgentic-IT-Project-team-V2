'use strict';

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

const { ProviderBackedLlmRuntimeAdapter } = require('../../platform/engine/agent-runtime-adapter');

const AGENT = { id: '01', name: 'Business Analyst' };
const PLATFORM = 'copilot';

let tmpRoot;

async function writeContractFixture(name, content) {
  const contractPath = path.join(tmpRoot, name);
  await fs.writeFile(contractPath, content, 'utf8');
  return contractPath;
}

async function writeSkillFixture(name, contractPath) {
  const skillPath = path.join(tmpRoot, name);
  const normalizedContractPath = contractPath.replace(/\\/g, '/');
  const content = [
    '# Skill Fixture',
    '',
    'Use this output contract:',
    normalizedContractPath,
    '',
    'Return only the deliverable content.',
  ].join('\n');
  await fs.writeFile(skillPath, content, 'utf8');
  return skillPath;
}

function validDeliverable() {
  return [
    '## Metadata',
    '- Agent: Business Analyst',
    '',
    '## Findings',
    '- Finding: runtime tool path verified',
    '',
    '## HANDOFF CHECKLIST',
    '- [x] Item 1',
    '- [x] Item 2',
    '- [x] Item 3',
    '- [x] Item 4',
    '- [x] Item 5',
    '- [x] Item 6',
    '- [x] Item 7',
    '- [x] Item 8',
    '- [x] Item 9',
  ].join('\n');
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'tool-executor-integration-'));
});

afterEach(async () => {
  if (tmpRoot) {
    await fs.rm(tmpRoot, { recursive: true, force: true });
    tmpRoot = null;
  }
});

describe('ProviderBackedLlmRuntimeAdapter tool execution integration', () => {
  it('allows read-only canonical tools for viewer role and emits audit hashes', async () => {
    const contractPath = await writeContractFixture(
      'tool-integration-contract.md',
      [
        '# Contract',
        '',
        '```markdown',
        '## Metadata',
        '## Findings',
        '## HANDOFF CHECKLIST',
        '```',
      ].join('\n')
    );
    const skillPath = await writeSkillFixture('tool-integration-skill.md', contractPath);

    const complete = vi
      .fn()
      .mockResolvedValueOnce({
        content: '',
        model: 'gpt-test',
        usage: { promptTokens: 8, completionTokens: 2, totalTokens: 10 },
        finishReason: 'tool_calls',
        toolCalls: [
          {
            id: 'tc-read-1',
            name: 'tool.test.run',
            arguments: {
              target: 'testing',
              operation: 'run-unit',
              params: { pattern: 'tests/unit/example.test.js' },
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: validDeliverable(),
        model: 'gpt-test',
        usage: { promptTokens: 14, completionTokens: 10, totalTokens: 24 },
        finishReason: 'stop',
      });

    const providerRegistry = {
      getProvider: vi.fn().mockReturnValue({
        providerName: 'openai',
        capabilities: {},
        complete,
      }),
    };

    const execute = vi.fn().mockResolvedValue({
      success: true,
      data: { passed: 1, failed: 0 },
      error: null,
      duration_ms: 7,
      adapter: 'testing',
      operation: 'run-unit',
      fromCache: false,
      timestamp: new Date().toISOString(),
    });

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'llm-openai-tools-readonly',
      providerName: 'openai',
      outputDir: tmpRoot,
      providerRegistry,
      toolExecutor: { execute },
      validationMaxRetries: 0,
    });

    const result = await adapter.invoke(AGENT, PLATFORM, {
      skillFile: skillPath,
      predecessorOutputs: {},
      questionnaireInput: null,
      role: 'viewer',
      profile: 'production-distributed',
      sessionState: { mode: 'AUDIT' },
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ target: 'testing', operation: 'run-unit' })
    );

    expect(result.response.toolInvocationCount).toBe(1);
    expect(result.response.toolTraceId).toBeTruthy();
    expect(result.response.toolAuditEvents).toHaveLength(1);
    expect(result.response.toolAuditEvents[0]).toEqual(
      expect.objectContaining({
        toolId: 'tool.test.run',
        role: 'viewer',
        profile: 'production-distributed',
        adapter: 'testing',
        operation: 'run-unit',
        success: true,
      })
    );
    expect(result.response.toolAuditEvents[0].traceId).toBe(result.response.toolTraceId);
    expect(result.response.toolAuditEvents[0].paramsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.response.toolAuditEvents[0].resultHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('denies mutating canonical tools for non-admin roles in production profiles', async () => {
    const contractPath = await writeContractFixture(
      'tool-integration-deny-contract.md',
      ['# Contract', '', '```markdown', '## Metadata', '## HANDOFF CHECKLIST', '```'].join('\n')
    );
    const skillPath = await writeSkillFixture('tool-integration-deny-skill.md', contractPath);

    const complete = vi.fn().mockResolvedValue({
      content: '',
      model: 'gpt-test',
      usage: { promptTokens: 8, completionTokens: 2, totalTokens: 10 },
      finishReason: 'tool_calls',
      toolCalls: [
        {
          id: 'tc-deny-1',
          name: 'tool.git.commit',
          arguments: {
            target: 'git',
            operation: 'commit',
            params: { message: 'test commit' },
          },
        },
      ],
    });

    const providerRegistry = {
      getProvider: vi.fn().mockReturnValue({
        providerName: 'openai',
        capabilities: {},
        complete,
      }),
    };

    const execute = vi.fn();
    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'llm-openai-tools-denied',
      providerName: 'openai',
      outputDir: tmpRoot,
      providerRegistry,
      toolExecutor: { execute },
      validationMaxRetries: 0,
    });

    await expect(
      adapter.invoke(AGENT, PLATFORM, {
        skillFile: skillPath,
        predecessorOutputs: {},
        questionnaireInput: null,
        role: 'operator',
        profile: 'production-distributed',
        sessionState: { mode: 'AUDIT' },
      })
    ).rejects.toThrow(/TOOL_UNAUTHORIZED/);

    expect(execute).not.toHaveBeenCalled();
  });
});
