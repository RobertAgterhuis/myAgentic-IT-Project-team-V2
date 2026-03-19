'use strict';

const {
  GitHubProvider,
  DockerContainerProvider,
  VitestTestingProvider,
  OpenAILLMProvider,
  AnthropicLLMProvider,
  CopilotLLMProvider,
} = require('../../platform/sdlc/adapters');

function makeExecQueue(responses) {
  const queue = [...responses];
  return async () => {
    if (queue.length === 0) {
      return { exitCode: 0, stdout: '', stderr: '', duration_ms: 1 };
    }
    const next = queue.shift();
    return {
      exitCode: next.exitCode ?? 0,
      stdout: next.stdout ?? '',
      stderr: next.stderr ?? '',
      duration_ms: next.duration_ms ?? 1,
    };
  };
}

describe('provider behavior coverage', () => {
  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('GitHubProvider handles listBranches and createBranch flow', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const provider = new GitHubProvider({ owner: 'acme', repo: 'demo' });
    provider._exec = makeExecQueue([
      {
        stdout:
          JSON.stringify([
            { name: 'main', protected: true },
            { name: 'dev', protected: false },
          ]) + '\n200',
      },
      { stdout: JSON.stringify({ default_branch: 'main' }) + '\n200' },
      { stdout: JSON.stringify({ default_branch: 'main' }) + '\n200' },
      { stdout: JSON.stringify({ object: { sha: 'abc123' } }) + '\n200' },
      { stdout: JSON.stringify({ ref: 'refs/heads/feature-x' }) + '\n201' },
    ]);

    const branches = await provider.listBranches();
    expect(branches).toEqual([
      { name: 'main', current: true },
      { name: 'dev', current: false },
    ]);

    const created = await provider.createBranch('feature-x');
    expect(created).toEqual({ branch: 'feature-x', created: true });
  });

  it('GitHubProvider decodes base64 file content', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    const provider = new GitHubProvider({ owner: 'acme', repo: 'demo' });
    provider._exec = makeExecQueue([
      {
        stdout:
          JSON.stringify({
            content: Buffer.from('hello world').toString('base64'),
            encoding: 'base64',
          }) + '\n200',
      },
    ]);

    const file = await provider.getFileContents('README.md', 'main');
    expect(file.path).toBe('README.md');
    expect(file.content).toBe('hello world');
    expect(file.encoding).toBe('utf-8');
  });

  it('DockerContainerProvider builds and pushes with registry tagging', async () => {
    const provider = new DockerContainerProvider({ registryUrl: 'ghcr.io/acme' });
    provider._exec = makeExecQueue([
      { exitCode: 0, stdout: 'build ok' },
      { exitCode: 0, stdout: 'tag ok' },
      { exitCode: 0, stdout: 'push ok' },
    ]);

    const buildResult = await provider.build({
      image: 'myapp',
      tag: '1.0.0',
      buildArgs: { NODE_ENV: 'prod' },
    });
    expect(buildResult.image).toBe('myapp');
    expect(buildResult.tag).toBe('1.0.0');

    const pushResult = await provider.push('myapp', '1.0.0');
    expect(pushResult).toEqual({ image: 'ghcr.io/acme/myapp:1.0.0', pushed: true });
  });

  it('DockerContainerProvider scans via trivy fallback when scout fails', async () => {
    const provider = new DockerContainerProvider();
    provider._exec = makeExecQueue([
      { exitCode: 1, stderr: 'scout unavailable' },
      {
        exitCode: 0,
        stdout: JSON.stringify({ Results: [{ Target: 'img', Vulnerabilities: [] }] }),
      },
    ]);
    provider._isAvail = async () => true;

    const result = await provider.scan('myapp:latest');
    expect(result.scanner).toBe('trivy');
    expect(Array.isArray(result.vulnerabilities)).toBe(true);
  });

  it('VitestTestingProvider parses text summary and coverage summary', async () => {
    const provider = new VitestTestingProvider({ projectRoot: process.cwd() });
    provider._exec = makeExecQueue([
      { exitCode: 0, stdout: '10 pass 2 fail 1 skip', stderr: '' },
      {
        exitCode: 0,
        stdout:
          'Statements   : 81.5%\nBranches     : 70%\nFunctions    : 76.2%\nLines        : 80.1%',
      },
    ]);

    const testRun = await provider.runTests({});
    expect(testRun.success).toBe(true);
    expect(testRun.summary).toMatchObject({ passed: 10, failed: 2, skipped: 1, total: 13 });

    const coverage = await provider.getCoverage();
    expect(coverage).toMatchObject({
      statements: 81.5,
      branches: 70,
      functions: 76.2,
      lines: 80.1,
    });
  });

  it('OpenAILLMProvider parses completion including tool calls', async () => {
    process.env.OPENAI_API_KEY = 'openai-test';
    const provider = new OpenAILLMProvider({ model: 'gpt-4o-mini' });
    provider._exec = makeExecQueue([
      {
        stdout:
          JSON.stringify({
            model: 'gpt-4o-mini',
            choices: [
              {
                message: {
                  content: 'done',
                  tool_calls: [
                    {
                      id: 'call1',
                      function: { name: 'search', arguments: JSON.stringify({ q: 'abc' }) },
                    },
                  ],
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }) + '\n200',
      },
    ]);

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [{ name: 'search', description: 'search', parameters: { type: 'object' } }],
    });

    expect(result.content).toBe('done');
    expect(result.model).toBe('gpt-4o-mini');
    expect(result.usage.totalTokens).toBe(15);
    expect(result.toolCalls[0]).toMatchObject({ id: 'call1', name: 'search' });
  });

  it('AnthropicLLMProvider parses text and tool use blocks', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-test';
    const provider = new AnthropicLLMProvider({ model: 'claude-sonnet-4-20250514' });
    provider._exec = makeExecQueue([
      {
        stdout:
          JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            content: [
              { type: 'text', text: 'answer' },
              { type: 'tool_use', id: 'tu1', name: 'lookup', input: { id: 42 } },
            ],
            usage: { input_tokens: 4, output_tokens: 6 },
            stop_reason: 'end_turn',
          }) + '\n200',
      },
    ]);

    const result = await provider.complete({
      messages: [
        { role: 'system', content: 'be concise' },
        { role: 'user', content: 'hello' },
      ],
      tools: [{ name: 'lookup', description: 'lookup', parameters: { type: 'object' } }],
    });

    expect(result.content).toBe('answer');
    expect(result.usage.totalTokens).toBe(10);
    expect(result.toolCalls[0]).toMatchObject({ id: 'tu1', name: 'lookup' });
  });

  it('CopilotLLMProvider returns completion and rejects embeddings', async () => {
    process.env.GITHUB_TOKEN = 'gh-test';
    const provider = new CopilotLLMProvider();
    provider._exec = makeExecQueue([
      {
        stdout:
          JSON.stringify({
            model: 'copilot-chat',
            choices: [{ message: { content: 'copilot says hi' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
          }) + '\n200',
      },
    ]);

    const completion = await provider.complete({ messages: [{ role: 'user', content: 'hello' }] });
    expect(completion.content).toBe('copilot says hi');
    expect(completion.model).toBe('copilot-chat');

    await expect(provider.embed({ text: 'x' })).rejects.toThrow('does not support embeddings');
  });
});
