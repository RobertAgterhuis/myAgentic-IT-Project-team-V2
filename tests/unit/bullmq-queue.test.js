'use strict';

function createBullJob(overrides = {}) {
  let data = {
    type: 'agent-invocation',
    payload: { value: 1 },
    priority: 4,
    createdAt: '2026-03-25T00:00:00.000Z',
    maxRetries: 2,
    retryCount: 0,
    ...overrides.data,
  };

  const bullJob = {
    id: overrides.id ?? 'job-1',
    data,
    returnvalue: overrides.returnvalue,
    attemptsMade: overrides.attemptsMade ?? 0,
    getState: vi.fn().mockResolvedValue(overrides.state ?? 'waiting'),
    updateData: vi.fn(async (next) => {
      data = next;
      bullJob.data = next;
    }),
    remove: vi.fn().mockResolvedValue(undefined),
  };

  return bullJob;
}

describe('BullMQQueue', () => {
  let QueueMock;
  let fromIdMock;
  let queueInstances;
  let BullMQQueue;

  async function loadModule() {
    vi.resetModules();
    queueInstances = [];

    QueueMock = vi.fn().mockImplementation(function MockQueue(name, options) {
      this.name = name;
      this.options = options;
      this.add = vi.fn();
      this.getJobs = vi.fn().mockResolvedValue([]);
      this.getJobCounts = vi.fn().mockResolvedValue({});
      this.close = vi.fn().mockResolvedValue(undefined);
      queueInstances.push(this);
    });

    fromIdMock = vi.fn();

    vi.doMock('bullmq', () => ({
      Queue: QueueMock,
      Job: {
        fromId: fromIdMock,
      },
    }));

    ({ BullMQQueue } = await import('../../platform/engine/jobs/bullmq-queue'));
  }

  beforeEach(async () => {
    await loadModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('constructs the queue with default prefix and exposes queue metadata', () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });

    expect(QueueMock).toHaveBeenCalledWith('jobs', {
      connection: { host: 'redis' },
      prefix: 'agentic',
    });
    expect(queue.prefix).toBe('agentic');
    expect(queue.queueName).toBe('jobs');
    expect(queue.connection).toEqual({ host: 'redis' });
  });

  it('enqueues jobs with clamped BullMQ priority and retry metadata', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' }, prefix: 'custom' });
    const instance = queueInstances[0];
    instance.add.mockResolvedValue({ id: 'bull-1' });

    const job = await queue.enqueue({
      type: 'policy-evaluation',
      payload: { policy: 'p1' },
      priority: 99,
      retryCount: 1,
      maxRetries: 3,
    });

    expect(instance.add).toHaveBeenCalledTimes(1);
    const [name, data, options] = instance.add.mock.calls[0];
    expect(name).toBe('policy-evaluation');
    expect(data).toMatchObject({
      type: 'policy-evaluation',
      payload: { policy: 'p1' },
      priority: 99,
      retryCount: 1,
      maxRetries: 3,
    });
    expect(typeof data.createdAt).toBe('string');
    expect(options).toEqual({
      priority: 0,
      attempts: 4,
      backoff: { type: 'exponential', delay: 2000 },
    });
    expect(job).toMatchObject({
      id: 'bull-1',
      type: 'policy-evaluation',
      payload: { policy: 'p1' },
      status: 'queued',
      priority: 99,
      retryCount: 0,
      maxRetries: 3,
    });
  });

  it('returns null for manual dequeue because workers pull directly', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });

    await expect(queue.dequeue(['agent-invocation'])).resolves.toBeNull();
  });

  it('updates completion metadata and preserves existing job data', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    const bullJob = createBullJob();
    fromIdMock.mockResolvedValue(bullJob);

    await queue.complete('job-1', { ok: true });

    expect(fromIdMock).toHaveBeenCalledWith(queueInstances[0], 'job-1');
    expect(bullJob.updateData).toHaveBeenCalledTimes(1);
    expect(bullJob.updateData.mock.calls[0][0]).toMatchObject({
      type: 'agent-invocation',
      payload: { value: 1 },
      completedAt: expect.any(String),
    });
  });

  it('records failure metadata on existing jobs', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    const bullJob = createBullJob();
    fromIdMock.mockResolvedValue(bullJob);

    await queue.fail('job-2', { message: 'boom', severity: 'recoverable' });

    expect(bullJob.updateData).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { message: 'boom', severity: 'recoverable' },
      })
    );
  });

  it('throws when complete, fail, or cancel target a missing job', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    fromIdMock.mockResolvedValue(null);

    await expect(queue.complete('missing', {})).rejects.toThrow('Job not found: missing');
    await expect(queue.fail('missing', { message: 'x', severity: 'fatal' })).rejects.toThrow(
      'Job not found: missing'
    );
    await expect(queue.cancel('missing')).rejects.toThrow('Job not found: missing');
  });

  it('removes jobs on cancel', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    const bullJob = createBullJob({ id: 'job-3' });
    fromIdMock.mockResolvedValue(bullJob);

    await queue.cancel('job-3');

    expect(bullJob.remove).toHaveBeenCalledTimes(1);
  });

  it('returns null when status cannot find a BullMQ job', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    fromIdMock.mockResolvedValue(null);

    await expect(queue.status('missing')).resolves.toBeNull();
  });

  it('maps BullMQ states into queue status values, including fallback', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    const states = ['waiting', 'delayed', 'prioritized', 'active', 'completed', 'failed', 'weird'];

    for (const [index, state] of states.entries()) {
      const bullJob = createBullJob({
        id: `job-${index}`,
        state,
        attemptsMade: index,
        returnvalue: { done: true },
        data: {
          type: 'gate-validation',
          payload: { idx: index },
          priority: index,
          createdAt: `2026-03-25T00:00:0${index}.000Z`,
          startedAt: '2026-03-25T00:01:00.000Z',
          completedAt: '2026-03-25T00:02:00.000Z',
          maxRetries: 4,
          error: { message: 'problem', severity: 'transient' },
        },
      });
      fromIdMock.mockResolvedValueOnce(bullJob);
    }

    const mapped = await Promise.all(states.map((_, index) => queue.status(`job-${index}`)));

    expect(mapped.map((job) => job.status)).toEqual([
      'queued',
      'queued',
      'queued',
      'running',
      'completed',
      'failed',
      'queued',
    ]);
    expect(mapped[5]).toMatchObject({
      result: { done: true },
      retryCount: 5,
      maxRetries: 4,
      error: { message: 'problem', severity: 'transient' },
    });
  });

  it('lists queued jobs using waiting, delayed, and prioritized states and applies type filtering', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    const instance = queueInstances[0];

    const waitingJob = createBullJob({
      id: 'waiting-1',
      state: 'waiting',
      data: {
        type: 'agent-invocation',
        payload: { order: 2 },
        priority: 2,
        createdAt: '2026-03-25T00:00:02.000Z',
        maxRetries: 1,
      },
    });
    const delayedJob = createBullJob({
      id: 'delayed-1',
      state: 'delayed',
      data: {
        type: 'policy-evaluation',
        payload: { order: 1 },
        priority: 9,
        createdAt: '2026-03-25T00:00:01.000Z',
        maxRetries: 3,
      },
    });
    const prioritizedJob = createBullJob({
      id: 'prio-1',
      state: 'prioritized',
      data: {
        type: 'policy-evaluation',
        payload: { order: 0 },
        priority: 9,
        createdAt: '2026-03-25T00:00:00.000Z',
        maxRetries: 3,
      },
    });

    instance.getJobs
      .mockResolvedValueOnce([waitingJob, delayedJob, prioritizedJob])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const jobs = await queue.list({
      status: 'queued',
      type: 'policy-evaluation',
      limit: 5,
      offset: 2,
    });

    expect(instance.getJobs).toHaveBeenCalledTimes(3);
    expect(instance.getJobs).toHaveBeenNthCalledWith(1, ['waiting'], 2, 6);
    expect(instance.getJobs).toHaveBeenNthCalledWith(2, ['delayed'], 2, 6);
    expect(instance.getJobs).toHaveBeenNthCalledWith(3, ['prioritized'], 2, 6);
    expect(jobs.map((job) => job.id)).toEqual(['prio-1', 'delayed-1']);
    expect(jobs.every((job) => job.type === 'policy-evaluation')).toBe(true);
    expect(jobs.every((job) => job.status === 'queued')).toBe(true);
  });

  it('lists all states when no status filter is provided and trims to the requested limit', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    const instance = queueInstances[0];

    instance.getJobs
      .mockResolvedValueOnce([
        createBullJob({
          id: 'a',
          state: 'waiting',
          data: {
            priority: 1,
            createdAt: '2026-03-25T00:00:03.000Z',
            maxRetries: 1,
            type: 'agent-invocation',
            payload: {},
          },
        }),
      ])
      .mockResolvedValueOnce([
        createBullJob({
          id: 'b',
          state: 'active',
          data: {
            priority: 5,
            createdAt: '2026-03-25T00:00:02.000Z',
            maxRetries: 1,
            type: 'gate-validation',
            payload: {},
          },
        }),
      ])
      .mockResolvedValueOnce([
        createBullJob({
          id: 'c',
          state: 'completed',
          data: {
            priority: 5,
            createdAt: '2026-03-25T00:00:01.000Z',
            maxRetries: 1,
            type: 'policy-evaluation',
            payload: {},
          },
        }),
      ])
      .mockResolvedValueOnce([
        createBullJob({
          id: 'd',
          state: 'failed',
          data: {
            priority: 3,
            createdAt: '2026-03-25T00:00:04.000Z',
            maxRetries: 1,
            type: 'artifact-registration',
            payload: {},
          },
        }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([null]);

    const jobs = await queue.list({ limit: 2 });

    expect(instance.getJobs).toHaveBeenNthCalledWith(1, ['waiting'], 0, 1);
    expect(instance.getJobs).toHaveBeenNthCalledWith(2, ['active'], 0, 1);
    expect(instance.getJobs).toHaveBeenNthCalledWith(3, ['completed'], 0, 1);
    expect(instance.getJobs).toHaveBeenNthCalledWith(4, ['failed'], 0, 1);
    expect(instance.getJobs).toHaveBeenNthCalledWith(5, ['delayed'], 0, 1);
    expect(instance.getJobs).toHaveBeenNthCalledWith(6, ['prioritized'], 0, 1);
    expect(jobs.map((job) => job.id)).toEqual(['c', 'b']);
  });

  it('returns aggregated counts for total and each status bucket', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });
    const instance = queueInstances[0];

    instance.getJobCounts
      .mockResolvedValueOnce({
        waiting: 1,
        active: 2,
        completed: 3,
        failed: 4,
        delayed: 5,
        prioritized: 6,
      })
      .mockResolvedValueOnce({ waiting: 7, delayed: 8, prioritized: 9 })
      .mockResolvedValueOnce({ active: 10 })
      .mockResolvedValueOnce({ completed: 11 })
      .mockResolvedValueOnce({ failed: 12 });

    await expect(queue.size()).resolves.toBe(21);
    await expect(queue.size('queued')).resolves.toBe(24);
    await expect(queue.size('running')).resolves.toBe(10);
    await expect(queue.size('completed')).resolves.toBe(11);
    await expect(queue.size('failed')).resolves.toBe(12);
    await expect(queue.size('cancelled')).resolves.toBe(0);
  });

  it('closes the BullMQ queue on destroy', async () => {
    const queue = new BullMQQueue({ connection: { host: 'redis' } });

    await queue.destroy();

    expect(queueInstances[0].close).toHaveBeenCalledTimes(1);
  });
});
