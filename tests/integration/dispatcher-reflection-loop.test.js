'use strict';

const { Dispatcher } = require('../../platform/engine/dispatcher');
const { STATES } = require('../../platform/engine/state-machine');

function createStore(files = {}) {
  return {
    exists: (fp) => fp in files,
    read: (fp) => files[fp] || '',
    readFile: (fp) => files[fp] || '',
    writeFile: (fp, content) => {
      files[fp] = content;
    },
    mkdirp: () => {},
    _files: files,
  };
}

function readRevisionEvents(store) {
  const raw = store.readFile('BusinessDocs/reasoning-collaboration/self-revision-events.jsonl');
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe('Dispatcher reflection loop integration', () => {
  it('persists a succeeded revision lifecycle after a bounded reinvocation', async () => {
    const store = createStore();
    let calls = 0;
    const dispatcher = new Dispatcher({
      store,
      invoker: async (_agent, _platform, context) => {
        calls += 1;
        if (calls === 1) {
          expect(context.revisionContext).toBeUndefined();
          return {
            outputPath: '/out/draft.md',
            response: {
              status: 'success',
              finishReason: 'stop',
              attempts: 1,
              usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
              deliverableQuality: { score: 45, approvalSignal: 'block', summary: 'draft' },
              contractValidation: { status: 'passed' },
            },
          };
        }

        expect(context.revisionContext).toMatchObject({
          trigger: 'quality-below-threshold',
          attempt: 1,
          maxAttempts: 1,
          previousOutputPath: '/out/draft.md',
        });

        return {
          outputPath: '/out/final.md',
          response: {
            status: 'success',
            finishReason: 'stop',
            attempts: 1,
            usage: { promptTokens: 12, completionTokens: 15, totalTokens: 27 },
            deliverableQuality: { score: 91, approvalSignal: 'approve', summary: 'final' },
            contractValidation: { status: 'passed' },
          },
        };
      },
      config: { maxRetries: 0, maxRevisionAttempts: 1 },
    });

    const result = await dispatcher.invoke(
      { id: '06', name: 'Senior Developer' },
      STATES.PHASE_2,
      {}
    );

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/out/final.md');

    const events = readRevisionEvents(store);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: 'succeeded',
      applied: true,
      trigger: 'quality-below-threshold',
    });
  });

  it('persists an escalated revision lifecycle when bounded reinvocation cannot recover', async () => {
    const store = createStore();
    const dispatcher = new Dispatcher({
      store,
      invoker: async () => ({
        outputPath: '/out/draft.md',
        response: {
          status: 'success',
          finishReason: 'stop',
          attempts: 1,
          usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 },
          deliverableQuality: { score: 35, approvalSignal: 'block', summary: 'still weak' },
          contractValidation: { status: 'passed' },
        },
      }),
      config: { maxRetries: 0, maxRevisionAttempts: 1 },
    });

    const result = await dispatcher.invoke(
      { id: '05', name: 'Software Architect' },
      STATES.PHASE_2,
      {}
    );

    expect(result.success).toBe(false);
    expect(result.stopReason).toBe('max-revision-attempts');

    const events = readRevisionEvents(store);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: 'escalated',
      terminalReason: 'max-revision-attempts',
      trigger: 'quality-below-threshold',
    });
  });
});
