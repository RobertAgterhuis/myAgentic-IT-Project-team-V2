'use strict';

const { PersistentQueue } = require('../../platform/engine/jobs/persistent-queue');

function makeInput(overrides = {}) {
  return {
    type: 'agent-invocation',
    payload: { agentId: '01', state: 'PHASE_1' },
    priority: 5,
    retryCount: 0,
    maxRetries: 2,
    ...overrides,
  };
}

function createStorage(seed = {}) {
  const collections = new Map();

  for (const [collection, docs] of Object.entries(seed)) {
    collections.set(collection, new Map(docs.map((doc) => [doc.id, { ...doc }])));
  }

  const getCollection = (name) => {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }
    return collections.get(name);
  };

  const matchesWhere = (doc, where) => {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => doc[key] === value);
  };

  return {
    name: 'test-storage',
    async read(collection, id) {
      const doc = getCollection(collection).get(id);
      return doc ? { ...doc } : null;
    },
    async write(collection, id, data) {
      getCollection(collection).set(id, { ...data, id });
    },
    async delete(collection, id) {
      getCollection(collection).delete(id);
    },
    async list(collection, filter = {}) {
      let docs = Array.from(getCollection(collection).values()).filter((doc) =>
        matchesWhere(doc, filter.where)
      );
      if (typeof filter.offset === 'number') {
        docs = docs.slice(filter.offset);
      }
      if (typeof filter.limit === 'number') {
        docs = docs.slice(0, filter.limit);
      }
      return docs.map((doc) => ({ ...doc }));
    },
    async transaction(ops) {
      for (const op of ops) {
        if (op.type === 'delete') {
          getCollection(op.collection).delete(op.id);
        } else {
          getCollection(op.collection).set(op.id, { ...op.data, id: op.id });
        }
      }
    },
    async query(collection, query) {
      return this.list(collection, query);
    },
    async initialize() {},
    async close() {},
    async health() {
      return { status: 'healthy', provider: 'test-storage', latencyMs: 0 };
    },
    metrics() {
      return {
        reads: 0,
        writes: 0,
        deletes: 0,
        errors: 0,
        readLatencies: [],
        writeLatencies: [],
      };
    },
  };
}

describe('PersistentQueue', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('recovers running jobs by re-queuing them', async () => {
    const storage = createStorage({
      jobs: [
        {
          ...makeInput({ id: 'job-running' }),
          status: 'running',
          createdAt: '2026-03-19T00:00:00.000Z',
          startedAt: '2026-03-19T00:01:00.000Z',
        },
        {
          ...makeInput({ id: 'job-queued' }),
          status: 'queued',
          createdAt: '2026-03-19T00:02:00.000Z',
        },
      ],
    });
    const queue = new PersistentQueue(storage);

    await expect(queue.recover()).resolves.toBe(1);

    await expect(queue.status('job-running')).resolves.toMatchObject({
      status: 'queued',
      startedAt: undefined,
    });
    await expect(queue.status('job-queued')).resolves.toMatchObject({ status: 'queued' });
  });

  it('dequeues by priority and FIFO order while honoring type filters', async () => {
    const storage = createStorage();
    const queue = new PersistentQueue(storage, { concurrency: 2 });

    const low = await queue.enqueue(makeInput({ priority: 1, payload: { name: 'low' } }));
    const high = await queue.enqueue(makeInput({ priority: 10, payload: { name: 'high' } }));
    const gated = await queue.enqueue(
      makeInput({
        type: 'gate-validation',
        priority: 10,
        payload: { name: 'gate' },
      })
    );

    const first = await queue.dequeue();
    const second = await queue.dequeue(['gate-validation']);

    expect(first.id).toBe(high.id);
    expect(second.id).toBe(gated.id);

    await queue.complete(first.id, 'done');
    await queue.complete(second.id, 'done');

    const third = await queue.dequeue();
    expect(third.id).toBe(low.id);
  });

  it('returns null when concurrency is saturated or no candidate matches', async () => {
    const storage = createStorage();
    const queue = new PersistentQueue(storage, { concurrency: 1 });

    await queue.enqueue(makeInput({ type: 'agent-invocation' }));
    await queue.enqueue(makeInput({ type: 'gate-validation' }));

    const running = await queue.dequeue();
    const blocked = await queue.dequeue();

    expect(running).not.toBeNull();
    expect(blocked).toBeNull();

    await queue.complete(running.id, 'done');
    await expect(queue.dequeue(['policy-evaluation'])).resolves.toBeNull();
  });

  it('retries transient failures, then dead-letters exhausted jobs', async () => {
    const storage = createStorage();
    const queue = new PersistentQueue(storage);
    const retriable = await queue.enqueue(makeInput({ maxRetries: 1 }));
    const terminal = await queue.enqueue(makeInput({ maxRetries: 0 }));

    await queue.dequeue();
    await queue.fail(retriable.id, { message: 'temporary', severity: 'transient' });

    await expect(queue.status(retriable.id)).resolves.toMatchObject({
      status: 'queued',
      retryCount: 1,
      error: { message: 'temporary', severity: 'transient' },
    });

    await queue.dequeue();
    await queue.fail(retriable.id, { message: 'still bad', severity: 'transient' });

    await expect(queue.status(retriable.id)).resolves.toMatchObject({
      status: 'failed',
      error: { message: 'still bad', severity: 'transient' },
    });

    const running = await queue.dequeue();
    expect(running.id).toBe(terminal.id);
    await queue.fail(terminal.id, { message: 'fatal', severity: 'fatal' });

    const dlq = await queue.deadLetterQueue();
    expect(dlq.map((job) => job.id).sort()).toEqual([retriable.id, terminal.id].sort());
  });

  it('cancels queued or running jobs and rejects terminal states', async () => {
    const storage = createStorage();
    const queue = new PersistentQueue(storage);
    const queued = await queue.enqueue(makeInput());

    await queue.cancel(queued.id);
    await expect(queue.status(queued.id)).resolves.toMatchObject({ status: 'cancelled' });

    const runningJob = await queue.enqueue(makeInput({ payload: { name: 'running' } }));
    await queue.dequeue();
    await queue.cancel(runningJob.id);
    await expect(queue.status(runningJob.id)).resolves.toMatchObject({ status: 'cancelled' });

    await expect(queue.cancel(queued.id)).rejects.toThrow(/Cannot cancel job in status/);
    await expect(queue.cancel('missing-job')).rejects.toThrow(/Job not found/);
  });

  it('lists, filters, counts, and returns null for missing status lookups', async () => {
    const storage = createStorage();
    const queue = new PersistentQueue(storage);

    const queued = await queue.enqueue(makeInput({ type: 'agent-invocation', priority: 1 }));
    const running = await queue.enqueue(makeInput({ type: 'gate-validation', priority: 9 }));
    await queue.dequeue(['gate-validation']);

    const filtered = await queue.list({ type: 'agent-invocation' });
    const all = await queue.list();

    expect(filtered.map((job) => job.id)).toEqual([queued.id]);
    expect(all.map((job) => job.id)).toEqual([running.id, queued.id]);

    await expect(queue.size()).resolves.toBe(2);
    await expect(queue.size('queued')).resolves.toBe(1);
    await expect(queue.size('running')).resolves.toBe(1);
    await expect(queue.status('missing-job')).resolves.toBeNull();
  });

  it('marks timed-out jobs for retry and destroy clears timers', async () => {
    vi.useFakeTimers();

    const storage = createStorage();
    const queue = new PersistentQueue(storage, { defaultTimeoutMs: 25 });
    const timed = await queue.enqueue(makeInput({ maxRetries: 1 }));
    const toClear = await queue.enqueue(makeInput({ payload: { name: 'clear' } }));

    await queue.dequeue();
    await queue.dequeue();
    queue.destroy();

    await vi.advanceTimersByTimeAsync(50);
    await expect(queue.status(timed.id)).resolves.toMatchObject({ status: 'running' });
    await expect(queue.status(toClear.id)).resolves.toMatchObject({ status: 'running' });

    const timeoutQueue = new PersistentQueue(createStorage(), { defaultTimeoutMs: 25 });
    const retryable = await timeoutQueue.enqueue(makeInput({ maxRetries: 1 }));
    await timeoutQueue.dequeue();

    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();

    await expect(timeoutQueue.status(retryable.id)).resolves.toMatchObject({
      status: 'queued',
      retryCount: 1,
      error: { message: 'Job timed out', severity: 'transient' },
    });

    timeoutQueue.destroy();
  });
});
